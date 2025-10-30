import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "remixicon/fonts/remixicon.css";
import { Header } from "./components/Layout/Header";
import { Welcome } from "./pages/Welcome";
import { AllianceDetail } from "./pages/AllianceDetail";
import PlayerDetail from "./pages/PlayerDetail";
import { CreateMatchup } from "./pages/CreateMatchup";
import { MatchupView } from "./pages/MatchupView";
import { AllianceLeaderboard } from "./pages/AllianceLeaderboard";
import { UniversalLeaderboard } from "./pages/UniversalLeaderboard";
import { Admin } from "./pages/Admin";
import AutoMatchup from "./pages/AutoMatchup";
import { FantasyLeague } from "./pages/FantasyLeague";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { AllianceComparison } from "./pages/AllianceComparison";
import { AllianceVsAlliance } from "./pages/AllianceVsAlliance";
import { FantasyEventDetail } from "./pages/FantasyEventDetail";
import { KvkFinalZone } from "./pages/KvkFinalZone";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";

function GTALanding({ onEnterApp }: { onEnterApp: () => void }) {
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<div className="w-full min-h-screen bg-[#0D0D0D] py-20">
					<Router>
						<Header />
						<main className="flex-1">
							<Routes>
								<Route path="/" element={<Welcome />} />
								<Route path="/alliance/:id" element={<AllianceDetail />} />
								<Route
									path="/alliance/:allianceId/player/:playerId"
									element={<PlayerDetail />}
								/>
								<Route path="/leaderboard" element={<AllianceLeaderboard />} />
								<Route
									path="/universal-leaderboard"
									element={<UniversalLeaderboard />}
								/>
								<Route path="/create-matchup" element={<CreateMatchup />} />
								<Route path="/matchup/:matchupData" element={<MatchupView />} />
								<Route path="/auto-matchup" element={<AutoMatchup />} />
								<Route path="/fantasy-league" element={<FantasyLeague />} />
								<Route
									path="/fantasy-event/:eventId"
									element={<FantasyEventDetail />}
								/>
								<Route
									path="/alliance/:id/comparison"
									element={<AllianceComparison />}
								/>
								<Route
									path="/alliance-vs-alliance"
									element={<AllianceVsAlliance />}
								/>
								<Route path="/kvk-final-zone" element={<KvkFinalZone />} />
								<Route
									path="/admin"
									element={
										<ProtectedRoute requireAdmin>
											<Admin />
										</ProtectedRoute>
									}
								/>
							</Routes>
						</main>
					</Router>
				</div>
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		</>
	);
}

function App() {
	return <GTALanding onEnterApp={() => {}} />;
}

export default App;
