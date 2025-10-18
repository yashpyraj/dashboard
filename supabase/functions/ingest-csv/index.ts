import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting CSV ingestion...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('Request received:', { 
      hasFileName: !!requestBody.fileName, 
      hasFileContent: !!requestBody.fileContent,
      generation: requestBody.generation 
    })

    const { fileName, fileContent, reprocess = false, generation = 'G2', seasonStartDate, seasonEndDate } = requestBody

    if (!fileName || (!fileContent && !reprocess)) {
      throw new Error('fileName and fileContent are required')
    }

    let csvContent: string = fileContent
    
    console.log('Processing file:', fileName)
    console.log('Content length:', csvContent.length)
    
    // Parse filename to extract alliance tag and scan date
    const basename = fileName.replace(/^.*[\\\/]/, '').replace('.csv', '')
    const match = basename.match(/^([A-Z0-9]+)-(\d{4}-\d{2}-\d{2})$/)
    
    if (!match) {
      throw new Error(`Invalid filename format. Expected: TAG-YYYY-MM-DD.csv, got: ${fileName}`)
    }
    
    const [, tag, scanDate] = match
    console.log('Parsed:', { tag, scanDate })
    
    // Validate date format
    const dateObj = new Date(scanDate)
    if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== scanDate) {
      throw new Error(`Invalid date in filename: ${scanDate}`)
    }

    // Calculate file hash
    const encoder = new TextEncoder()
    const data = encoder.encode(csvContent)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    console.log('File hash calculated:', fileHash.substring(0, 8) + '...')

    // Parse CSV content with better handling
    const lines = csvContent.trim().split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row')
    }

    console.log('CSV lines found:', lines.length)

    // Parse headers
    const headerLine = lines[0]
    const headers = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        headers.push(current.trim().replace(/"/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    headers.push(current.trim().replace(/"/g, ''))

    console.log('Headers parsed:', headers.length, 'columns')

    // Parse data rows
    const rows = []
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      if (!line.trim()) continue
      
      const values = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/"/g, ''))
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim().replace(/"/g, ''))
      
      // Create row object
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      // Only add rows with required fields
      if (row.lord_id && row.name) {
        rows.push(row)
      }
    }

    console.log(`Parsed ${rows.length} valid data rows`)

    if (rows.length === 0) {
      throw new Error('CSV file contains no valid data rows with lord_id and name')
    }

    // Upsert alliance
    console.log('Upserting alliance...')
    const { data: alliance, error: allianceError } = await supabaseClient
      .from('alliances')
      .upsert({ 
        tag, 
        name: tag,
        generation: generation,
        season_start_date: seasonStartDate || (generation === 'G2' ? '2024-08-02' : null),
        season_end_date: seasonEndDate || (generation === 'G2' ? '2024-09-03' : null),
        season_name: generation === 'G2' ? 'Season 1' : null
      }, { onConflict: 'tag' })
      .select('id')
      .single()

    if (allianceError) {
      console.error('Alliance upsert error:', allianceError)
      throw new Error(`Failed to upsert alliance: ${allianceError.message}`)
    }

    console.log(`Alliance upserted: ${alliance.id}`)

    // Upsert scan
    console.log('Upserting scan...')
    const { data: scan, error: scanError } = await supabaseClient
      .from('scans')
      .upsert({
        alliance_id: alliance.id,
        scan_date: scanDate,
        source_filename: fileName,
        file_sha256: fileHash
      }, { onConflict: 'alliance_id,scan_date' })
      .select('id')
      .single()

    if (scanError) {
      console.error('Scan upsert error:', scanError)
      throw new Error(`Failed to upsert scan: ${scanError.message}`)
    }

    console.log(`Scan upserted: ${scan.id}`)

    // Helper functions for safe parsing
    const safeParseInt = (value: string): number | null => {
      if (!value || value.trim() === '' || value.toLowerCase() === 'null') return null
      const cleaned = value.replace(/,/g, '').trim()
      const parsed = parseInt(cleaned, 10)
      return isNaN(parsed) ? null : parsed
    }

    const safeParseBoolean = (value: string): boolean | null => {
      if (!value || value.trim() === '' || value.toLowerCase() === 'null') return null
      const trimmed = value.trim().toLowerCase()
      if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes') return true
      if (trimmed === 'false' || trimmed === '0' || trimmed === 'no') return false
      return null
    }

    // Process in smaller batches
    const BATCH_SIZE = 25
    let processedRows = 0

    console.log(`Processing ${rows.length} rows in batches of ${BATCH_SIZE}`)

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i/BATCH_SIZE) + 1
      const totalBatches = Math.ceil(rows.length/BATCH_SIZE)
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} rows)`)
      
      // Prepare player data
      const playerData = batch.map(row => ({
        lord_id: row.lord_id?.trim(),
        current_name: row.name?.trim(),
        faction: row.faction?.trim() || null,
        first_seen: scanDate,
        last_seen: scanDate
      })).filter(p => p.lord_id && p.current_name)

      if (playerData.length === 0) {
        console.log(`Batch ${batchNum} has no valid players, skipping`)
        continue
      }

      // Upsert players
      const { data: players, error: playersError } = await supabaseClient
        .from('players')
        .upsert(playerData, { onConflict: 'lord_id' })
        .select('id, lord_id')

      if (playersError) {
        console.error('Players upsert error:', playersError)
        throw new Error(`Failed to upsert players in batch ${batchNum}: ${playersError.message}`)
      }

      console.log(`Batch ${batchNum}: Upserted ${players.length} players`)

      // Create lord_id to player_id mapping
      const lordIdToPlayerId = new Map()
      players.forEach(player => {
        lordIdToPlayerId.set(player.lord_id, player.id)
      })

      // Prepare player stats data
      const statsData = batch.map(row => {
        const playerId = lordIdToPlayerId.get(row.lord_id?.trim())
        if (!playerId) {
          console.warn(`No player ID found for lord_id: ${row.lord_id}`)
          return null
        }

        return {
          player_id: playerId,
          scan_id: scan.id,
          alliance_tag: row.alliance_tag?.trim() || tag,
          name: row.name?.trim(),
          town_center: safeParseInt(row.town_center),
          home_server: row.home_server?.trim() || null,
          map_id: safeParseInt(row.map_id),
          in_power_rankings: safeParseBoolean(row.in_power_rankings),
          power: safeParseInt(row.power),
          highest_power: safeParseInt(row.highest_power),
          merits: safeParseInt(row.merits),
          units_killed: safeParseInt(row.units_killed),
          legion_power: safeParseInt(row.legion_power),
          tech_power: safeParseInt(row.tech_power),
          building_power: safeParseInt(row.building_power),
          hero_power: safeParseInt(row.hero_power),
          units_dead: safeParseInt(row.units_dead),
          units_healed: safeParseInt(row.units_healed),
          city_sieges: safeParseInt(row.city_sieges),
          defeats: safeParseInt(row.defeats),
          victories: safeParseInt(row.victories),
          scouted: safeParseInt(row.scouted),
          gold: safeParseInt(row.gold),
          wood: safeParseInt(row.wood),
          ore: safeParseInt(row.ore),
          mana: safeParseInt(row.mana),
          gems: safeParseInt(row.gems),
          resources_given: safeParseInt(row.resources_given),
          resources_given_count: safeParseInt(row.resources_given_count),
          helps_given: safeParseInt(row.helps_given),
          gold_spent: safeParseInt(row.gold_spent),
          wood_spent: safeParseInt(row.wood_spent),
          stone_spent: safeParseInt(row.stone_spent),
          mana_spent: safeParseInt(row.mana_spent),
          gems_spent: safeParseInt(row.gems_spent),
          killcount_t5: safeParseInt(row.killcount_t5),
          killcount_t4: safeParseInt(row.killcount_t4),
          killcount_t3: safeParseInt(row.killcount_t3),
          killcount_t2: safeParseInt(row.killcount_t2),
          killcount_t1: safeParseInt(row.killcount_t1),
        }
      }).filter(Boolean)

      if (statsData.length === 0) {
        console.log(`Batch ${batchNum} has no valid stats data, skipping`)
        continue
      }

      // Insert player stats
      const { error: statsError } = await supabaseClient
        .from('player_stats')
        .upsert(statsData, { onConflict: 'player_id,scan_id' })

      if (statsError) {
        console.error('Stats upsert error:', statsError)
        throw new Error(`Failed to insert player stats in batch ${batchNum}: ${statsError.message}`)
      }

      console.log(`Batch ${batchNum}: Inserted ${statsData.length} player stats`)
      processedRows += batch.length
    }

    // Update player seen dates (simplified approach)
    console.log('Updating player seen dates...')
    let updatedPlayers = 0
    
    for (const row of rows.slice(0, 100)) { // Limit to first 100 to avoid timeout
      if (!row.lord_id || !row.name) continue
      
      try {
        const { error: updateError } = await supabaseClient
          .from('players')
          .update({ 
            last_seen: scanDate,
            current_name: row.name.trim()
          })
          .eq('lord_id', row.lord_id.trim())
        
        if (!updateError) {
          updatedPlayers++
        }
      } catch (e) {
        // Continue on individual errors
        console.warn(`Error updating player ${row.lord_id}:`, e)
      }
    }

    console.log(`Updated ${updatedPlayers} player records`)

    const response = {
      success: true,
      message: `Successfully processed ${processedRows} rows for alliance ${tag} on ${scanDate}`,
      alliance: tag,
      scanDate,
      processedRows,
      updatedPlayers,
      generation,
    }

    console.log('Ingestion completed successfully:', response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Ingestion error:', error)
    
    const errorResponse = {
      success: false,
      error: error.message,
      details: error.stack,
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})