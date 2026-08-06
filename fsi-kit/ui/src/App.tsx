import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import FsiShell from "./components/layout/FsiShell";
import InvestmentResearchPage from "./pages/InvestmentResearchPage";
import KitHome from "./pages/KitHome";
import MerchantRiskPage from "./pages/MerchantRiskPage";
import InvestigatorPage from "./pages/compliance/InvestigatorPage";
import WatchlistPage from "./pages/compliance/WatchlistPage";

export default function App() {
  return <BrowserRouter><Routes><Route element={<FsiShell/>}><Route index element={<KitHome/>}/><Route path="compliance" element={<Navigate to="/compliance/watchlist" replace/>}/><Route path="compliance/watchlist" element={<WatchlistPage/>}/><Route path="compliance/investigator" element={<InvestigatorPage/>}/><Route path="investment-research" element={<InvestmentResearchPage/>}/><Route path="merchant-risk" element={<MerchantRiskPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></BrowserRouter>;
}
