import icons from "../assets/icons/icons";
import Layout from "../components/Layout";

import GenealogyReportView from "./GenealogyReportView";

function GenealogyReportPage() {
  return (
    <Layout
      icon={icons.dashboardIcon}
      nameRoute={"Reporte"}
      nameSubRoute={"Reporte de genealogía"}
    >
      <GenealogyReportView />
    </Layout>
  );
}

export default GenealogyReportPage;
