import {useState} from "react";
import {usePortal} from "../portal.jsx";
import Providers from "./Providers.jsx";
import ServerMonitorView from "../ServerMonitorView.jsx";
import ContentSourcesWorkspace from "@deltatv/ui/ContentSourcesWorkspace";

export default function Servers({initialTab="links"}) {
  const {isReseller,providers,codes,loadProviders,loadCodes}=usePortal();
  const [tab,setTab]=useState(initialTab);
  const refresh=()=>{loadProviders();loadCodes();};
  const qualityContent=<ServerMonitorView scope="partner"/>;
  if(isReseller) return <Providers providers={providers} codes={codes} onChanged={refresh} tab={tab} onTabChange={setTab} qualityContent={qualityContent}/>;
  return <ContentSourcesWorkspace title="Fontes de conteúdo" description="Links disponíveis para sua conta. Edições são feitas pela administração."
    sources={providers} activeTab={tab} onTabChange={setTab} canEdit={false} onRefresh={refresh}
    showSummary={false} qualityContent={qualityContent}/>;
}
