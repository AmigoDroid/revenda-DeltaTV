import {connectRealtime as connectSharedRealtime} from '@deltatv/ui/realtime';
import {getAuth,ensureAccessToken} from './api.js';
export const connectRealtime = () => connectSharedRealtime({getAuth,ensureAccessToken,apiUrl:import.meta.env.VITE_API_URL || 'http://localhost:3000'});
