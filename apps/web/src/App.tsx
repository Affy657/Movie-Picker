import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<CreateEvent />} />
        <Route path="/s/:slug" element={<EventDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
