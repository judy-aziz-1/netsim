import TestCanvas from './components/TestCanvas';
import { registerUser, getTopologies } from './api/client';
import { useAuthStore } from './store/authStore';

function App() {
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);

  const handleTestRegister = async () => {
    try {
      const data = await registerUser('Test User', 'test2@test.com', 'password123');
      setToken(data.token);
      console.log(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestGetTopologies = async () => {
    try {
      const data = await getTopologies(token);
      console.log(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <button onClick={handleTestRegister}>Test Register</button>
      <button onClick={handleTestGetTopologies}>Test Get Topologies</button>
      <TestCanvas />
    </div>
  );
}

export default App;
