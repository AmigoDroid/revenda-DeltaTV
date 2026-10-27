import { usePortal } from "../portal.jsx";
import Providers from "./Providers.jsx";
import { Badge, Table } from "../ui.jsx";

export default function Servers() {
  const { isReseller, providers, codes, loadProviders, loadCodes } = usePortal();
  if (isReseller) return <Providers providers={providers} codes={codes} onChanged={() => { loadProviders(); loadCodes(); }} />;
  return (
    <>
      <Table><thead><tr><th>Nome</th><th>URL base</th><th>Status</th></tr></thead><tbody>{providers.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.baseUrl}</td><td><Badge status={p.status} /></td></tr>)}</tbody></Table>
      <p className="muted">Para alterar os servidores, fale com a plataforma.</p>
    </>
  );
}
