import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ComplianceEngine from './pages/ComplianceEngine';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/compliance-engine" element={<ComplianceEngine />} />
      </Routes>
    </Router>
  );
}

export default App;
