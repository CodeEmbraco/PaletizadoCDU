import icons from "../assets/icons/icons";
import { useEffect, useState } from "react";
import {
  Add,
  Barcode,
  Box,
  Box1,
  Category,
  Cd,
  FormatSquare,
  Grid8,
  Hashtag,
  HashtagSquare,
  Health,
  Notepad2,
  Scan,
  Code,
} from "iconsax-react";

const DEV_PASSWORD = "dev1234";

import Stepper from "@keyvaluesystems/react-vertical-stepper";

import GraphicHistory from "../partials/paletization/GraphicHistory";

import useScanDetection from "use-scan-detection";

import { useSelector, useDispatch } from "react-redux";

import {
  selectOrderSelected,
  metadataOrderSelected,
  setOrderSelected,
  setMetadataOrderSelected,
} from "../store/slice/orderSelectedSlice";

import { addEventToPaletizationLog, selectPaletizationLog } from "../store/slice/eventsLogSlice";
import {
  getTestResults,
  selectTestResults,
  selectGlobalStatus,
  setGlobalStatus,
  setTestResults,
} from "../store/slice/testResultSlice";
import {
  createPallet,
  selectPallet,
  selectComponents,
  mountComponent,
  processInSAP,
  getCompressor,
  setComponentsJoined,
  setComponents,
  selectLoadingProcessInSap,
  selectPalletNotified,
  setPalletNotified,
  setPallet,
} from "../store/slice/palletsSlice";
import ComponentsTable from "../partials/paletization/ComponentsTable";

import {
  notifyPalletScanned,
  notifyProductScanned,
  notifyError,
  notifyPalletProductValidated,
} from "../partials/paletization/Toasts";
import ModalBlank from "../components/ModalBlank";
import CompressorMismatchModal from "../components/CompressorMismatchModal";
import PalletProductMismatchModal from "../components/PalletProductMismatchModal";
import CondenserMismatchModal from "../components/CondenserMismatchModal";
import InvalidOrderModal from "../components/InvalidOrderModal";


function PaletizationView() {
  const testResultsList = useSelector(selectTestResults);
  const globalStatus = useSelector(selectGlobalStatus);
  const orderSelected = useSelector(selectOrderSelected);
  const metadata = useSelector(metadataOrderSelected);
  const paletizationLog = useSelector(selectPaletizationLog);

  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const [barcodePallet, setBarcodePallet] = useState("Escanea pallet");
  const [barcodeProduct, setBarcodeProduct] = useState("Escanea producto");

  const [treeData, setTreeData] = useState([]);

  const dispatch = useDispatch();

  const [selectedItems, setSelectedItems] = useState([]);

  const palletSelected = useSelector(selectPallet);

  const componentsList = useSelector(selectComponents);

  const isLoading = useSelector(selectLoadingProcessInSap);
  const palletNotified = useSelector(selectPalletNotified);

  const [hasProcessed, setHasProcessed] = useState(false);
  const [isProcessingPallet, setIsProcessingPallet] = useState(false);
  const [isPalletCreating, setIsPalletCreating] = useState(false);

  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [mismatchInfo, setMismatchInfo] = useState({
    expectedMaterial: "",
    scannedSerial: "",
    expectedPrefix: "",
    scannedPrefix: "",
  });

  const [palletProductValidated, setPalletProductValidated] = useState(false);
  const [palletProductMismatchOpen, setPalletProductMismatchOpen] = useState(false);
  const [palletProductMismatchInfo, setPalletProductMismatchInfo] = useState({
    expectedProduct: "",
    scannedProduct: "",
  });

  const [condenserMismatchOpen, setCondenserMismatchOpen] = useState(false);
  const [condenserMismatchInfo, setCondenserMismatchInfo] = useState({
    expectedProduct: "",
    scannedProduct: "",
    scannedSerial: "",
  });

  // El pallet ya fue notificado a SAP: el trabajo terminó y queda congelado
  // (no se permite montar, desmontar ni editar la cantidad).
  const isPalletProcessed =
    !!palletSelected?.identifier &&
    palletNotified?.ICharg === palletSelected?.identifier;

  // Orden incompleta en SAP: no trae ningún componente de compresor (tipo "C").
  // Sin ese material no hay contra qué validar los escaneos, así que se bloquea
  // todo el flujo hasta descartar la orden.
  const orderInvalid =
    Object.keys(orderSelected).length > 0 &&
    !(orderSelected.components ?? []).some((c) => c?.tipo === "C" && c?.matnr);

  useEffect(() => {
    if (!orderInvalid) return;
    dispatch(
      addEventToPaletizationLog({
        text:
          "Orden " +
          orderSelected.aufnr +
          ' BLOQUEADA: incompleta, no contiene componente de compresor (tipo "C").',
        timestamp: new Date().toISOString(),
      })
    );
  }, [orderInvalid, orderSelected.aufnr]);

  function handleDiscardInvalidOrder() {
    dispatch(
      addEventToPaletizationLog({
        text: "Orden incompleta descartada: " + orderSelected.aufnr,
        timestamp: new Date().toISOString(),
      })
    );
    dispatch(setOrderSelected({}));
    dispatch(setMetadataOrderSelected([]));
    handleNew();
  }

  useEffect(() => {
    return () => {
      dispatch(setOrderSelected({}));
      dispatch(setMetadataOrderSelected([]));
      dispatch(setGlobalStatus(""));
      dispatch(setTestResults([]));
      dispatch(setComponentsJoined(false));
      dispatch(setComponents([]));
      dispatch(setPallet({}));
      dispatch(setPalletNotified({}));
    };
  }, []);

  useEffect(() => {
    setHasProcessed(false);
    setPalletProductValidated(false);
    // El API confirmó el pallet — liberar el bloqueo de escaneo
    if (palletSelected?.identifier) {
      setIsPalletCreating(false);
    }
  }, [palletSelected?.identifier]);

  const handleSelectedItems = (selectedItems) => {
    setSelectedItems([...selectedItems]);
  };

  const handleScan = async (rawCode) => {
    const code = rawCode.replace(/Shift/g, "").toUpperCase();
    console.log(code);
    if (code === "NEW") {
      handleNew();
      return;
    }

    // Orden incompleta: no se permite escanear nada hasta descartarla
    if (orderInvalid) {
      notifyError(
        "Orden incompleta: no contiene el componente de compresor. Descártala y selecciona otra orden."
      );
      dispatch(
        addEventToPaletizationLog({
          text: "Escaneo ignorado por orden incompleta: " + code,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // Bloquear escaneos mientras el API confirma el pallet recién escaneado
    if (isPalletCreating) {
      notifyError("Esperando confirmación del pallet, intenta de nuevo en un momento.");
      return;
    }

    // El pallet ya fue procesado/notificado a SAP: queda congelado.
    // No se montan más componentes; para iniciar otro hay que presionar "Nuevo".
    if (isPalletProcessed) {
      notifyError('El pallet ya fue procesado. Presiona "Nuevo" para iniciar otro.');
      dispatch(
        addEventToPaletizationLog({
          text: "Escaneo ignorado: el pallet ya fue procesado. Código: " + code,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    const palletIdentifier = palletSelected?.identifier;
    const hasPallet =
      palletIdentifier &&
      palletIdentifier !== "undefined" &&
      String(palletIdentifier).trim() !== "";
    const expectedProductCode = (orderSelected?.matnr?.slice(-9) ?? "").toUpperCase();

    // Estado intermedio: ya hay pallet pero el producto del pallet aún no se ha validado.
    // El siguiente escaneo se interpreta como el código de producto impreso en la etiqueta del pallet.
    if (hasPallet && !palletProductValidated) {
      if (code.length >= 11) {
        notifyError(
          "Escanea primero el código de producto del pallet antes de montar un componente"
        );
        dispatch(
          addEventToPaletizationLog({
            text:
              "Intento de montar componente sin validar producto del pallet: " +
              code,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }
      if (code === expectedProductCode) {
        setPalletProductValidated(true);
        notifyPalletProductValidated(code);
        dispatch(
          addEventToPaletizationLog({
            text: "Producto del pallet validado: " + code,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }
      setPalletProductMismatchInfo({
        expectedProduct: expectedProductCode,
        scannedProduct: code,
      });
      setPalletProductMismatchOpen(true);
      dispatch(
        addEventToPaletizationLog({
          text:
            "Producto del pallet RECHAZADO. Esperado: " +
            expectedProductCode +
            " | Escaneado: " +
            code,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    if (code.length >= 11) {
      // Bloquear el escaneo de componente si aún no se ha escaneado un pallet válido.
      // Evita montar componentes contra un pallet "undefined" que después queda atorado en BD.
      if (!hasPallet) {
        notifyError("Escanea primero el pallet antes de montar un componente");
        dispatch(
          addEventToPaletizationLog({
            text: "Intento de montar componente sin pallet escaneado: " + code,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // Validar que el componente escaneado sea del producto de la orden.
      // En el serial del condensador el material va en los PRIMEROS 9
      // caracteres (igual que qrValue.slice(0, 9) en la genealogía/etiqueta).
      // El producto de la orden son los ÚLTIMOS 9 del matnr (el matnr trae
      // ceros de relleno al inicio). Si no coinciden, se rechaza el montaje.
      const scannedProductCode = code.slice(0, 9).toUpperCase();
      if (
        scannedProductCode &&
        expectedProductCode &&
        scannedProductCode !== expectedProductCode
      ) {
        setCondenserMismatchInfo({
          expectedProduct: expectedProductCode,
          scannedProduct: scannedProductCode,
          scannedSerial: code,
        });
        setCondenserMismatchOpen(true);
        dispatch(
          addEventToPaletizationLog({
            text:
              "Componente RECHAZADO por producto no coincide. Esperado: " +
              expectedProductCode +
              " | Escaneado: " +
              scannedProductCode +
              " (" +
              code +
              ")",
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      const codeScannedEvent = {
        text: "Producto escaneado: " + code,
        timestamp: new Date().toISOString(),
      };
      notifyProductScanned(code);
      setBarcodeProduct(code);
      dispatch(addEventToPaletizationLog(codeScannedEvent));
      dispatch(getTestResults(code));

      const getTestResultsEvent = {
        text: "Consultando resultados de prueba de producto: " + code,
        timestamp: new Date().toISOString(),
      };

      dispatch(addEventToPaletizationLog(getTestResultsEvent));

      const response = await dispatch(getCompressor(code));
      const condenserMaterial = orderSelected.matnr?.slice(-9) ?? "";
      const compressorComponent = orderSelected.components?.find((c) => c.tipo === "C");
      const compressorMaterial =
        compressorComponent?.matnr || response?.compressor_material_code || "";

      const compressorSerial = response?.compressor_unit_serial ?? "";
      const cleaned = String(compressorMaterial).replace(/^0+/, "");
      const dotIdx = cleaned.search(/[.…]/);
      const expectedPrefix =
        dotIdx > 0 ? cleaned.slice(0, dotIdx) : cleaned.slice(-9).slice(0, 7);
      const scannedPrefix = compressorSerial.slice(0, expectedPrefix.length);
      if (
        expectedPrefix &&
        scannedPrefix &&
        expectedPrefix !== scannedPrefix
      ) {
        setMismatchInfo({
          expectedMaterial: cleaned,
          scannedSerial: compressorSerial,
          expectedPrefix,
          scannedPrefix,
        });
        setMismatchOpen(true);
        dispatch(
          addEventToPaletizationLog({
            text:
              "Componente RECHAZADO por material de compresor no coincide. Esperado: " +
              expectedPrefix +
              " | Compresor: " +
              scannedPrefix +
              " (" +
              compressorSerial +
              ") | Condenser: " +
              code,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      const data = {
        palette: palletSelected.identifier,
        condenser: code,
        compressor: response.compressor_unit_serial,
        compressorMaterial: compressorMaterial,
        condenserMaterial: condenserMaterial,
      };
      console.log(data);
      dispatch(mountComponent(data));
    } else {
      // Evitar que el código de producto de la orden se trate como pallet
      if (expectedProductCode && code === expectedProductCode) {
        notifyError("Ese es el código de producto, no el pallet. Escanea primero el código de barras del pallet.");
        dispatch(
          addEventToPaletizationLog({
            text: "Intento de escanear código de producto como pallet: " + code,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }
      const codeScannedEvent = {
        text: "Pallet escaneado: " + code,
        timestamp: new Date().toISOString(),
      };
      setBarcodePallet(code);
      setIsPalletCreating(true);
      dispatch(addEventToPaletizationLog(codeScannedEvent));
      dispatch(
        createPallet(
          orderSelected.aufnr,
          code,
          orderSelected.matnr.slice(-9),
          metadata.find((obj) => obj.ID_CARACTMATERIAL === 185)?.DE_VALORCARACTMAT,
          () => setIsPalletCreating(false)
        )
      );

      const createPalletEvent = {
        text: "Consultando registro de Pallet: " + code,
        timestamp: new Date().toISOString(),
      };
      notifyPalletScanned(code);
      dispatch(addEventToPaletizationLog(createPalletEvent));
    }
  };

  useScanDetection({
    onComplete: (code) => handleScan(code),
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  var stepsArray = [
    {
      label: "Prueba eléctrica",
      description: "Aprobada, sin errores, finalizada hace 14 minutos.",
      status: "visited",
    },
    {
      label: "Prueba de vacío",
      description: "En proceso, iniciada el 9/05/2023 a las 12:30 PM.",
      status: "unvisited",
    },
  ];

  function formatTimestampToDDMMYYYYHHMMSS(timestamp) {
    const date = new Date(timestamp);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  const stylesOverride = {
    LabelTitle: (step, stepIndex) => ({ marginLeft: "8px", fontSize: 15 }),
    ActiveLabelTitle: (step, stepIndex) => ({
      marginLeft: "0px",
      fontSize: 15,
    }),
    LabelDescription: (step, stepIndex) => ({
      marginLeft: "8px",
      fontSize: 13,
    }),
    ActiveLabelDescription: (step, stepIndex) => ({
      marginLeft: "0px",
      fontSize: 13,
    }),
    LineSeparator: (step, stepIndex) => ({ borderRight: "2px solid #dfdff2" }),
    InactiveLineSeparator: (step, stepIndex) => ({
      borderRight: "2px solid #dfdff2",
    }),
    Bubble: (step, stepIndex) => (
      console.log(stepIndex === currentStepIndex),
      console.log(step.status),
      {
        width: "40px",
        height: "40px",
        backgroundColor: step.status === "skipped" ? "red" : "#15B053",
        color: "#fff",
      }
    ),
    ActiveBubble: (step, stepIndex) => ({
      width: "40px",
      height: "40px",
      backgroundColor: step.status === "skipped" ? "red" : "#15B053",
      color: "#fff",
      background: "#15B053",
      border:
        step.status === "skipped" ? "7px solid #ee9090" : "7px solid #A1DFBA",
    }),
    InActiveBubble: (step, stepIndex) => ({
      width: "40px",
      height: "40px",
      backgroundColor: "#F0F1F3",
      color: "#000000",
    }),
  };
  // useEffect(() => {
  //   setTimeout(() => {
  //     localStorage.removeItem("b-gantt-trial-start");
  //     window.location.reload();
  //   }, 60000);

  // }, []);

  function handleNew() {
    console.log("Handle new step");
    setBarcodePallet("Escanea pallet");
    setBarcodeProduct("Escanea producto");
    dispatch(setGlobalStatus(""));
    dispatch(setTestResults([]));
    dispatch(setComponentsJoined(false));
    dispatch(setComponents([]));
    dispatch(setPallet({}));
    dispatch(setPalletNotified({}));
    setHasProcessed(false);
    setIsPalletCreating(false);
    setPalletProductValidated(false);
    setPalletProductMismatchOpen(false);
    setPalletProductMismatchInfo({ expectedProduct: "", scannedProduct: "" });
    setCondenserMismatchOpen(false);
    setCondenserMismatchInfo({ expectedProduct: "", scannedProduct: "", scannedSerial: "" });
    setMismatchOpen(false);
    const handleNewEvent = {
      text:
        "Comando NUEVO detectado. Proceso reiniciado." ,
      timestamp: new Date().toISOString(),
    };
    dispatch(addEventToPaletizationLog(handleNewEvent));
  }

  async function handleNotify() {
    if (
      hasProcessed ||
      isProcessingPallet ||
      isLoading ||
      palletNotified?.ICharg === palletSelected?.identifier
    ) {
      return;
    }
    setHasProcessed(true);
    setIsProcessingPallet(true);
    try {
      await dispatch(processInSAP(orderSelected, palletSelected, componentsList));
    } catch (error) {
      console.log("Error al procesar pallet: " + error);
      setHasProcessed(false);
    } finally {
      setIsProcessingPallet(false);
    }
  }

  function buildTreeData(obj) {
    if (typeof obj === "undefined" || Object.keys(obj).length === 0) {
      console.log("Boom undefined");
      return [];
    } else {
      const treeData = [];
      const mainMatnr = obj.matnr.slice(-9); // Obtener los últimos 9 caracteres de matnr

      const parentNode = {
        id: 1,
        label: mainMatnr,
        children: [],
      };

      const childNode = {
        id: 2,
        label: obj.components?.[0]?.matnr ?? "",
      };

      parentNode.children.push(childNode);
      treeData.push(parentNode);

      return treeData;
    }
  }

  const [expandedNodes, setExpandedNodes] = useState([]);
  const [editingPalletQty, setEditingPalletQty] = useState(false);
  const [palletQtyInput, setPalletQtyInput] = useState("");

  // Dev mode
  const [devModeActive, setDevModeActive] = useState(
    () => localStorage.getItem("devMode") === "true"
  );
  const [devPasswordInput, setDevPasswordInput] = useState("");
  const [devPasswordModalOpen, setDevPasswordModalOpen] = useState(false);
  const [devPalletInput, setDevPalletInput] = useState("");
  const [devProductInput, setDevProductInput] = useState("");

  const activateDevMode = () => {
    localStorage.setItem("devMode", "true");
    setDevModeActive(true);
  };
  const deactivateDevMode = () => {
    localStorage.removeItem("devMode");
    setDevModeActive(false);
  };

  const toggleNode = (nodeId) => {
    if (expandedNodes.includes(nodeId)) {
      setExpandedNodes(expandedNodes.filter((id) => id !== nodeId));
    } else {
      setExpandedNodes([...expandedNodes, nodeId]);
    }
  };

  const renderNode = (node) => {
    const isNodeExpanded = expandedNodes.includes(node.id);
    const hasChildNodes = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="tree-node">
        <div
          className={`tree-node__label ${
            hasChildNodes ? "tree-node__label--clickable" : ""
          }`}
          onClick={() => hasChildNodes && toggleNode(node.id)}
        >
          {hasChildNodes && (
            <span
              className={`tree-node__icon ${
                isNodeExpanded
                  ? "tree-node__icon--expanded"
                  : "tree-node__icon--collapsed"
              }`}
            ></span>
          )}
          {node.label}
        </div>
        {isNodeExpanded && hasChildNodes && (
          <div className="tree-node__children">
            {node.children.map((childNode) => renderNode(childNode))}
          </div>
        )}
      </div>
    );
  };

  function handlePalletQtyClick() {
    // No permitir editar la cantidad si el pallet ya fue procesado
    if (isPalletProcessed) return;
    const current = metadata?.find((obj) => obj.ID_CARACTMATERIAL === 185)?.DE_VALORCARACTMAT ?? "";
    setPalletQtyInput(current);
    setEditingPalletQty(true);
  }

  function handlePalletQtyConfirm() {
    if (palletQtyInput !== "" && !isNaN(palletQtyInput)) {
      const updated = metadata.map((obj) =>
        obj.ID_CARACTMATERIAL === 185
          ? { ...obj, DE_VALORCARACTMAT: palletQtyInput }
          : obj
      );
      dispatch(setMetadataOrderSelected(updated));
    }
    setEditingPalletQty(false);
  }

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-2 w-full max-w-10xl mx-auto">
        <div className="max-w-full mx-4 py-0 sm:mx-auto sm:px-6 lg:px-4">
          <header>
            <div className="mt-8">
              <div className="flex items-center justify-between h-16 -mb-px">
                <h3 className="text-black text-2xl capitalize font-semibold text-gray-400 tracking-tight">
                  Paletización
                </h3>
                {/* Header: Right side */}
                <div className="flex items-center space-x-3">
                  {Object.keys(orderSelected).length === 0 ? null : (
                    <button
                      onClick={handleNew}
                      className="border border-slate-300 rounded w-32 h-12 text-base flex justify-center font-semibold"
                    >
                      <Add
                        className="mr-2 my-auto bg-transparent"
                        color="black"
                        size={20}
                      />
                      <span className="my-auto text-black font-semibold">
                        Nuevo
                      </span>
                    </button>

                  )}
                  <button
                    onClick={() => {
                      if (devModeActive) {
                        deactivateDevMode();
                      } else {
                        setDevPasswordInput("");
                        setDevPasswordModalOpen(true);
                      }
                    }}
                    title="Modo desarrollador"
                    className={`border rounded w-10 h-12 flex items-center justify-center ${
                      devModeActive
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-300"
                    }`}
                  >
                    <Code size={18} color={devModeActive ? "#d97706" : "#94a3b8"} />
                  </button>
                  {componentsList.length === 0 ? null : (
                    isLoading ? (<button
                      onClick={
                        handleNotify
                        //
                      }
                      className={
                         "w-64 h-12 btn bg-primary text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-none"
                      }
                      disabled={
                           true
                      }
                    >

                    <svg
                        className="animate-spin bg-transparent w-4 h-4 fill-current shrink-0 mr-2"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                      </svg>
                      <span className="bg-transparent my-auto text-white font-semibold">
                        Cargando...
                      </span>
                    </button>) : (
                      (() => {
                        const hasUnsent = componentsList.some(
                          (component) => component.send_to_sap === false
                        );
                        const meetsMinCount =
                          componentsList.length >=
                          Number(
                            metadata?.find(
                              (obj) => obj.ID_CARACTMATERIAL === 185
                            )?.DE_VALORCARACTMAT
                          );
                        const alreadyNotified =
                          palletNotified?.ICharg === palletSelected?.identifier;
                        const ready =
                          hasUnsent &&
                          meetsMinCount &&
                          !hasProcessed &&
                          !isProcessingPallet &&
                          !alreadyNotified;
                        return (
                      <button
                      onClick={handleNotify}
                      className={
                        ready
                          ? "w-64 h-12 bg-primary rounded text-white text-base flex justify-center hover:bg-green-500"
                          : "w-64 h-12 bg-secondary rounded text-black text-base flex justify-center hover:text-white disabled:pointer-events-none"
                      }
                      disabled={!ready}
                    >

                      <span className="bg-transparent my-auto text-white font-semibold">
                        Procesar
                      </span>
                    </button>
                        );
                      })()
                    )
                  )}
                </div>

               

              </div>
            </div>
          </header>

          

          <div className="max-w-full mx-4 py-0 sm:mx-auto">
            <div className="sm:flex sm:space-x-4">
              <section className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:w-1/3 sm:my-4">
                <div className="bg-white p-5">
                  <div className="sm:flex sm:items-start bg-white">
                    <div className="bg-white text-center sm:mt-0 sm:ml-2 sm:text-left">
                      <div className="flex items-center">
                        <Grid8 className="mr-2" color="#A0A2A6" size={20} />
                        <h3 className="bg-white text-md font-medium text-gray">
                          Pallet
                        </h3>
                      </div>

                      <p className="bg-white text-3xl font-bold text-black">
                        {Object.keys(orderSelected).length === 0
                          ? "Selecciona órden"
                          : barcodePallet}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:w-1/3 sm:my-4">
                <div className="bg-white p-5">
                  <div className="sm:flex sm:items-start bg-white">
                    <div className="bg-white text-center sm:mt-0 sm:ml-2 sm:text-left">
                      <div className="flex items-center">
                        <Category className="mr-2" color="#A0A2A6" size={20} />
                        <h3 className="bg-white text-md font-medium text-gray">
                          Número serial actual
                        </h3>
                      </div>

                      <p className="bg-white text-3xl font-bold text-black">
                        {Object.keys(orderSelected).length === 0
                          ? "--------"
                          : barcodeProduct}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:w-1/6 sm:my-4">
                <div className="bg-white p-5">
                  <div className="sm:flex sm:items-start bg-white">
                    <div className="bg-white text-center sm:mt-0 sm:ml-2 sm:text-left">
                      <div className="flex items-center">
                        <HashtagSquare
                          variant="Outline"
                          className="mr-2"
                          color="#A0A2A6"
                          size={20}
                        />
                        <h3 className="bg-white text-md font-medium text-gray">
                          Cantidad pallet
                        </h3>
                      </div>

                      {editingPalletQty ? (
                        <input
                          className="text-3xl font-bold text-black border-b-2 border-primary outline-none w-24 bg-white"
                          type="number"
                          value={palletQtyInput}
                          autoFocus
                          onChange={(e) => setPalletQtyInput(e.target.value)}
                          onBlur={handlePalletQtyConfirm}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handlePalletQtyConfirm();
                            if (e.key === "Escape") setEditingPalletQty(false);
                          }}
                        />
                      ) : (
                        <p
                          className={`bg-white text-3xl font-bold text-black ${
                            isPalletProcessed
                              ? "cursor-default"
                              : "cursor-pointer hover:text-primary"
                          }`}
                          onClick={handlePalletQtyClick}
                          title={
                            isPalletProcessed
                              ? "Pallet procesado, cantidad bloqueada"
                              : "Click para editar"
                          }
                        >
                          {Array.isArray(metadata) && metadata.length > 0
                            ? metadata.find(
                                (obj) => obj.ID_CARACTMATERIAL === 185
                              )?.DE_VALORCARACTMAT
                            : "--------"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:w-1/6 sm:my-4">
                <div className="bg-white p-5">
                  <div className="sm:flex sm:items-start bg-white">
                    <div className="bg-white text-center sm:mt-0 sm:ml-2 sm:text-left">
                      <div className="flex items-center">
                        <Health className="mr-2" color="#A0A2A6" size={20} />
                        <h3 className="bg-white text-md font-medium text-gray">
                          Total montados
                        </h3>
                      </div>

                      <p className="bg-white text-3xl font-bold text-black">
                        {Object.keys(orderSelected).length === 0
                          ? "--------"
                          : componentsList.length}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
            <div className="sm:flex sm:space-x-4">
              <div
                className="flex flex-col w-1/3"
                style={{ paddingRight: "7px" }}
              >
                <section className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:my-4">
                  <div className="bg-white p-5">
                    <div className="sm:flex sm:items-start bg-white">
                      <div className="bg-white text-center sm:mt-0 sm:ml-2 sm:text-left">
                        <div className="flex items-center">
                          <Notepad2
                            className="mr-2"
                            color="#A0A2A6"
                            size={20}
                          />
                          <h3 className="bg-white text-md font-medium text-gray">
                            Órden
                          </h3>
                        </div>
                        <p className="bg-white text-3xl font-bold text-black">
                          {Object.keys(orderSelected).length === 0
                            ? "Selecciona órden"
                            : orderSelected.aufnr}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:my-4">
                  <div className="bg-white p-5">
                    <div className="sm:flex sm:items-start bg-white">
                      <div className="bg-white text-center sm:mt-0 sm:ml-2 sm:text-left">
                        <div className="flex items-center">
                          <Box1
                            variant="Outline"
                            className="mr-2"
                            color="#A0A2A6"
                            size={20}
                          />
                          <h3 className="bg-white text-md font-medium text-gray">
                            Producto
                          </h3>
                        </div>
                        <p className="bg-white text-3xl font-bold text-black">
                          {Object.keys(orderSelected).length === 0
                            ? "--------"
                            : orderSelected.matnr.slice(-9)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section
                style={{
                  maxHeight: "645px",
                  minHeight: "200px",
                  overflowY: "scroll",
                }}
                className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:my-4 w-3/4"
              >
                <div className="bg-white p-5">
                  <h3 className="bg-white text-md font-medium text-gray">
                    Listado de componentes
                  </h3>
                  <div
                    className="flex justify-start"
                    style={{ marginLeft: "-10px" }}
                  >
                    <ComponentsTable selectedItems={handleSelectedItems} />
                    <div></div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <hr class="solid" />
          <div className="mt-8 flex">
            <h3 className="text-black text-2xl capitalize font-semibold text-gray-400 tracking-tight">
              Información adicional
            </h3>
          </div>

          <div className="sm:flex sm:space-x-4 mt-4">
            <section
              style={{ height: "245px", overflowY: "scroll" }}
              className="inline-block align-bottom rounded-lg border border-slate-200 text-left mb-4 w-full sm:w-1/3 sm:my-4"
            >
              <div className="bg-white p-5">
                <h3 className="bg-white text-md font-medium text-gray">
                  Log de eventos
                </h3>
                <div
                  className="bg-white text-sm text-black"
                  style={{ maxHeight: "450px", overflowY: "auto" }}
                >
                 {paletizationLog
                    .slice()
                    .reverse()
                    .map((event, index, array) => (
                      <p
                        key={index}
                        style={{ fontWeight: index === 0 ? "bold" : "normal" }}
                      >
                        <span style={{ color: "green" }}>
                          {formatTimestampToDDMMYYYYHHMMSS(event.timestamp)}
                        </span>{" "}
                        - {event.text}{" "}
                      </p>
                    ))}
                </div>
              </div>
            </section>

            <section className="inline-block align-bottom rounded-lg border border-slate-200 text-left overflow-hidden mb-4 w-full sm:w-1/3 sm:my-4">
              <div className="bg-white p-5">
                <h3 className="bg-white text-md font-medium text-gray">
                  Resultados de pruebas
                </h3>
                <h3 className="bg-white text-2xl font-semibold text-black">
                  {testResultsList && testResultsList.length > 0 ? (
                    <div>
                      Estado global:{" "}
                      <span
                        className={
                          globalStatus === 1 ? "text-primary" : "text-red-500"
                        }
                      >
                        {globalStatus === 1 ? "OK" : "Error"}
                      </span>
                      {/* Muestra los detalles de los resultados de prueba aquí si es necesario */}
                    </div>
                  ) : (
                    <p className="text-black">
                      Resultados de pruebas no disponibles.
                    </p>
                  )}
                </h3>
                <div
                  className="flex grid justify-start"
                  style={{ marginLeft: "-10px", marginTop: "10px" }}
                >
                  {testResultsList && testResultsList.length > 0 ? (
                    <div>
                      <Stepper
                        className="!ml-0"
                        steps={testResultsList}
                        currentStepIndex={2}
                        styles={stylesOverride}
                      />

                      {/* Muestra los detalles de los resultados de prueba aquí si es necesario */}
                    </div>
                  ) : (
                    <p className="text-black ml-3"></p>
                  )}
                  <div></div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Dev mode password modal */}
      {devPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Modo desarrollador</h3>
            <p className="text-sm text-slate-500 mb-4">Ingresa la contraseña para activar.</p>
            <input
              type="password"
              autoFocus
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3 outline-none focus:border-amber-400"
              placeholder="Contraseña"
              value={devPasswordInput}
              onChange={(e) => setDevPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (devPasswordInput === DEV_PASSWORD) {
                    activateDevMode();
                    setDevPasswordModalOpen(false);
                  } else {
                    setDevPasswordInput("");
                  }
                }
                if (e.key === "Escape") setDevPasswordModalOpen(false);
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50"
                onClick={() => setDevPasswordModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-amber-400 text-white rounded hover:bg-amber-500"
                onClick={() => {
                  if (devPasswordInput === DEV_PASSWORD) {
                    activateDevMode();
                    setDevPasswordModalOpen(false);
                  } else {
                    setDevPasswordInput("");
                  }
                }}
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dev mode floating panel */}
      {devModeActive && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border-2 border-amber-400 rounded-xl shadow-2xl p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Code size={16} color="#d97706" />
              <span className="text-sm font-semibold text-amber-600">Dev Mode</span>
            </div>
            <button
              onClick={() => deactivateDevMode()}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Simular Pallet */}
          <div className="mb-3">
            <label className="text-xs text-slate-500 block mb-1">Simular escaneo de Pallet</label>
            <div className="flex space-x-1">
              <input
                className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-amber-400"
                placeholder="ID Pallet (7 dígitos)"
                value={devPalletInput}
                onChange={(e) => setDevPalletInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && devPalletInput.trim()) {
                    handleScan(devPalletInput.trim());
                    setDevPalletInput("");
                  }
                }}
              />
              <button
                className="px-2 py-1.5 bg-amber-400 text-white text-xs rounded hover:bg-amber-500 disabled:opacity-40"
                disabled={!devPalletInput.trim()}
                onClick={() => {
                  handleScan(devPalletInput.trim());
                  setDevPalletInput("");
                }}
              >
                Scan
              </button>
            </div>
          </div>

          {/* Simular Producto */}
          <div className="mb-3">
            <label className="text-xs text-slate-500 block mb-1">Simular escaneo de Producto</label>
            <div className="flex space-x-1">
              <input
                className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-amber-400"
                placeholder="Ej. 515380042826MHTNC"
                value={devProductInput}
                onChange={(e) => setDevProductInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && devProductInput.trim()) {
                    handleScan(devProductInput.trim());
                    setDevProductInput("");
                  }
                }}
              />
              <button
                className="px-2 py-1.5 bg-amber-400 text-white text-xs rounded hover:bg-amber-500 disabled:opacity-40"
                disabled={!devProductInput.trim()}
                onClick={() => {
                  handleScan(devProductInput.trim());
                  setDevProductInput("");
                }}
              >
                Scan
              </button>
            </div>
          </div>

          {/* Botón NEW */}
          <button
            className="w-full py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => handleScan("NEW")}
          >
            Enviar comando NEW
          </button>
        </div>
      )}

      <CompressorMismatchModal
        open={mismatchOpen}
        onClose={() => setMismatchOpen(false)}
        expectedMaterial={mismatchInfo.expectedMaterial}
        scannedSerial={mismatchInfo.scannedSerial}
        expectedPrefix={mismatchInfo.expectedPrefix}
        scannedPrefix={mismatchInfo.scannedPrefix}
      />

      <PalletProductMismatchModal
        open={palletProductMismatchOpen}
        onClose={() => setPalletProductMismatchOpen(false)}
        expectedProduct={palletProductMismatchInfo.expectedProduct}
        scannedProduct={palletProductMismatchInfo.scannedProduct}
      />

      <CondenserMismatchModal
        open={condenserMismatchOpen}
        onClose={() => setCondenserMismatchOpen(false)}
        expectedProduct={condenserMismatchInfo.expectedProduct}
        scannedProduct={condenserMismatchInfo.scannedProduct}
        scannedSerial={condenserMismatchInfo.scannedSerial}
      />

      <InvalidOrderModal
        open={orderInvalid}
        orderNumber={orderSelected.aufnr}
        material={orderSelected.matnr?.slice(-9)}
        onDiscard={handleDiscardInvalidOrder}
      />

      <ModalBlank
        id="info-modal"
        modalOpen={infoModalOpen}
        setModalOpen={setInfoModalOpen}
      >
        <div className="p-5 flex space-x-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-rose-100">
            <svg
              className="w-4 h-4 shrink-0 fill-current text-rose-500"
              viewBox="0 0 16 16"
            >
              <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 12H7V7h2v5zM8 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
            </svg>
          </div>
          {/* Content */}
          <div>
            {/* Modal header */}
            <div className="mb-2">
              <div className="text-lg font-semibold text-slate-800 text-left">
                No es posible montar {barcodeProduct}
              </div>
            </div>
            {/* Modal content */}
            <div className="text-sm mb-10 text-left">
              <div className="space-y-2">
                <p>
                  El componente no puede ser montado ya que hay uno o más
                  errores en sus pruebas, es posible que el componente se
                  encuentre dañado:
                </p>
                <h3 className="bg-white text-md font-medium text-gray">
                  Semáforo
                </h3>
                <h3 className="bg-white text-2xl font-semibold text-black">
                  {testResultsList && testResultsList.length > 0 ? (
                    <div>
                      Estado global:{" "}
                      <span
                        className={
                          globalStatus === 1 ? "text-primary" : "text-red-500"
                        }
                      >
                        {globalStatus === 1 ? "OK" : "Error"}
                      </span>
                      {/* Muestra los detalles de los resultados de prueba aquí si es necesario */}
                    </div>
                  ) : (
                    <p className="text-black">
                      Resultados de pruebas no disponibles.
                    </p>
                  )}
                </h3>
                <div
                  className="flex grid justify-start"
                  style={{ marginLeft: "-10px", marginTop: "10px" }}
                >
                  {testResultsList && testResultsList.length > 0 ? (
                    <div>
                      <Stepper
                        className="!ml-0"
                        steps={testResultsList}
                        currentStepIndex={2}
                        styles={stylesOverride}
                      />

                      {/* Muestra los detalles de los resultados de prueba aquí si es necesario */}
                    </div>
                  ) : (
                    <p className="text-black ml-3"></p>
                  )}
                  <div></div>
                </div>
              </div>
            </div>
            {/* Modal footer */}
            <div className="flex flex-wrap justify-end">
              <button
                className="btn-sm bg-primary hover:primary text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoModalOpen(false);
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </ModalBlank>
    </>
  );
}

export default PaletizationView;
