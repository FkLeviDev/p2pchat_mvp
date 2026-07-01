import { PeerProvider, usePeer } from './context/PeerContext';
import { useAutoPilot } from './hooks/useAutoPilot';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/layout/Dashboard';
import ConnectionPanel from './components/chat/ConnectionPanel';
import DataStream from './components/chat/DataStream';
import MessageInput from './components/chat/MessageInput';

export default function App() {
  return (
    <PeerProvider>
      <Router />
    </PeerProvider>
  );
}

function Router() {
  const { peerReady } = usePeer();

  // ── AutoPilot is now always loaded, allowing dynamic toggling from settings UI
  useAutoPilot();

  if (!peerReady) return <SetupScreen />;

  return (
    <Dashboard
      sidebar={<ConnectionPanel />}
      main={
        <>
          <DataStream />
          <MessageInput />
        </>
      }
    />
  );
}
