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

  // ── AutoPilot is only loaded locally if the environment variable is explicitly set to true.
  //    This ensures the Vercel production build remains completely untouched.
  const isLocalAutopilotEnabled = import.meta.env.VITE_ENABLE_AUTOPILOT === 'true';
  
  if (isLocalAutopilotEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAutoPilot();
  }

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
