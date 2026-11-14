import {useEffect,useState} from "react";
import ServerMonitorView from "@deltatv/ui/ServerMonitorView";
import {api} from "./api.js";
export default function ResellerServerMonitorView({scope="partner"}) {
  const [plan,setPlan]=useState(null);
  useEffect(()=>{if(scope!=="partner")return;let active=true;api("/partner/service-plan").then(p=>{if(active)setPlan(p)}).catch(()=>{});return()=>{active=false}},[scope]);
  return <ServerMonitorView scope={scope} api={api} plan={plan}/>;
}
