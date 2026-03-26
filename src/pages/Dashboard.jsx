import icons from "../assets/icons/icons";
import Layout from "../components/Layout";
import { useEffect } from "react";

import GenealogyDashboard from "./Genealogy";

function Dashboard() {
  // useEffect(() => {
  //   setTimeout(() => {
  //     localStorage.removeItem("b-gantt-trial-start");
  //     window.location.reload();
  //   }, 60000);
   
  // }, []);

  return (
    <Layout
      icon={icons.dashboardIcon}
      nameRoute={"Dashboard"}
      nameSubRoute={"Dashboard"}
    >
        <GenealogyDashboard/>
    </Layout>
  );
}

export default Dashboard;