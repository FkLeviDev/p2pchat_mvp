import { PeerProvider } from './context/PeerContext';
import { usePeer } from './context/PeerContext';
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
