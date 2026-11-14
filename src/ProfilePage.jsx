/** Thin adapter: mantém sessão e transporte no painel revenda. */
import SharedProfilePage from '@deltatv/ui/ProfilePage';
import { api, logout, updateAuthUser } from './api.js';
export default function ProfilePage(props) { return <SharedProfilePage variant="revenda" api={api} logout={logout} updateAuthUser={updateAuthUser} {...props}/>; }
