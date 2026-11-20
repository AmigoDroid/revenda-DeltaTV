import {api} from "./api.js";
import SupportCenter from "@deltatv/ui/SupportCenter";
export default function ResellerSupportCenter(props) {
  return <SupportCenter {...props} api={api} />;
}
