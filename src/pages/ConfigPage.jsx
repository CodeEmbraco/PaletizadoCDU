import icons from "../assets/icons/icons";
import Layout from "../components/Layout";

import ConfigView from "./ConfigView";

function ConfigPage() {
  return (
    <Layout
      icon={icons.dashboardIcon}
      nameRoute={"Configuración"}
      nameSubRoute={"Configuración"}
    >
      <ConfigView />
    </Layout>
  );
}

export default ConfigPage;
