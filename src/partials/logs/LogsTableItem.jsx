import React, { useState, useRef } from "react";
import { API_BASE } from "../../utils/apiBase";

import { useDispatch, useSelector } from "react-redux";

import {
  setOrderSelected,
  getMetadataFromOrder,
} from "../../store/slice/orderSelectedSlice";

import { addEvent } from "../../store/slice/eventsLogSlice";
import {
  unmountComponent,
  unmountComponentAPI,
  selectPallet,
  reprocessPallet,
} from "../../store/slice/palletsSlice";
import ModalBlank from "../../components/ModalBlank";
import { Check, Clock, InfoCircle, Verify, Warning2 } from "iconsax-react";

function LogsItem(props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dispatch = useDispatch();
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const palletSelected = useSelector(selectPallet);
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);
  const [processedOk, setProcessedOk] = useState(false);
  const [devInterface, setDevInterface] = useState("F");
  const [devFase, setDevFase] = useState("");
  const [devComplemento, setDevComplemento] = useState(" ");

  const handleDelete = async () => {
    try {
      await fetch(
        `${API_BASE()}/api/v1/paletization/pallets/${props.identifier}/`,
        { method: "DELETE" }
      );
      props.fetchPallets("&workstation=MXCDU01");
    } catch (error) {
      console.error("Error al eliminar el pallet:", error);
    }
  };

  const handleReprocess = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      const interfaceVal = props.devMode ? devInterface : "F";
      const faseVal = props.devMode ? devFase : undefined;
      const complementoVal = props.devMode ? devComplemento : undefined;
      const ok = await dispatch(reprocessPallet(props.identifier, props.mounted_components_count, interfaceVal, faseVal, complementoVal));
      if (ok) setProcessedOk(true);
      await props.fetchPallets("&workstation=MXCDU01");
    } catch (error) {
      console.log("Error al reprocesar el lote: " + error);
    } finally {
      setIsLoading(false);
      setDangerModalOpen(false);
      inFlight.current = false;
    }
  };

  // Función para formatear la fecha y hora
  function formatDateTime(datetime) {
    const dateObj = new Date(datetime);

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();

    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const seconds = String(dateObj.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  return (
    <>
      <tr>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
          <div className="flex items-center">
            <button
              className={`text-slate-400 hover:text-slate-500 transform ${detailsOpen && 'rotate-180'}`}
              aria-expanded={detailsOpen}
              onClick={() => { setDetailsOpen(!detailsOpen); console.log(props.mounted_components)}}
              aria-controls={`details-${props.id}`}
            >
              <span className="sr-only">Menu</span>
              <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                <path d="M16 20l-5.4-5.4 1.4-1.4 4 4 4-4 1.4 1.4z" />
              </svg>
            </button>
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="flex items-center">
            
              <a className="font-medium">
                {props.id}
              </a>
   
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-center text-md font-medium">
            {props.identifier}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-center text-md font-medium">
            {props.product}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-center text-md font-medium">
            {props.order}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-6 whitespace-nowrap">
          <div className="text-center text-md font-medium">
            {props.mounted_components_count}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-center text-md font-medium">
            {formatDateTime(props.datetimeCreated)}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-center font-medium">
            {props.sendToSAP === true && props.sapSuccess ? (
              <div className="flex">
                <Verify className="mr-2" color="#009B4A" size={20} />
                <p className="text-primary">{props.sapStatus}</p>
              </div>
            ) : (
              <div className="flex text-center">
                <InfoCircle className="mr-2" color="gray" size={20} />
                <p className="text-gray">{props.sapStatus}</p>
              </div>
            )}
          </div>
        </td>
        {props.devMode && (
          <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(true); }}
              className="text-center font-semibold text-red-500 border btn border-red-200 hover:bg-red-50 w-full"
            >
              Eliminar
            </button>
          </td>
        )}
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
          {/* Menu button */}
          {(props.sapSuccess || processedOk) && !props.devMode ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-center font-semibold text-gray border btn border-slate-300 pointer-events-none w-full"
            >
              Reprocesar
            </button>
          ) : isLoading ? (
            <button
              className={
                "btn bg-primary text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-none"
              }
              disabled={true}
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
            </button>
          ) : (
            <button
              aria-controls="danger-modal"
              onClick={(e) => {
                e.stopPropagation();
                setDangerModalOpen(true);
              }}
              className="text-center font-semibold text-primary w-full"
            >
              Reprocesar
            </button>
          )}
        </td>
      </tr>
      {/*
      Example of content revealing when clicking the button on the right side:
      Note that you must set a "colSpan" attribute on the <td> element,
      and it should match the number of columns in your table
      */}
      <tr id={`details-${props.id}`} role="region" className={`${!detailsOpen && 'hidden'}`}>
  <td colSpan="10" className="px-2 first:pl-5 last:pr-5 py-3">
    <div className="flex items-center bg-slate-50 p-3 -mt-3">
      <table className="table-auto w-full" >
      <thead className="text-xs font-normal uppercase text-gray bg-slate-50 border-t border-b border-slate-200">
        <tr>
          <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div className="font-medium">No.</div></th>
          <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div className="font-medium">Condensador (Serial)</div></th>
          <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div className="font-medium">Condensador (Material)</div></th>
          <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div className="font-medium">Compresor (Serial)</div></th>
          <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div className="font-medium">Compresor (Material)</div></th>
        </tr>
      </thead>
      <tbody>
        {props.mounted_components.map((component, index) => {
           const rowNumber = index + 1;
          return (
          <tr key={component.id}>
            <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px font-medium text-gray">{rowNumber}</td>
            <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px font-medium text-gray">{component.condenser_unit_serial}</td>
            <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px font-medium text-gray">{component.condenser_material_code}</td>
            <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px font-medium text-gray">{component.compressor_unit_serial}</td>
            <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px font-medium text-gray">{component.compressor_material_code}</td>
          </tr>
        )})}
      </tbody>
    </table>
    </div>
    {/* Renderizar los componentes montados en una tabla */}
    
  </td>
</tr>
      {/* Delete Modal (dev mode) */}
      <ModalBlank
        id="delete-modal"
        modalOpen={deleteModalOpen}
        setModalOpen={setDeleteModalOpen}
      >
        <div className="p-5 flex space-x-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100">
            <svg className="w-4 h-4 shrink-0 fill-current text-red-500" viewBox="0 0 16 16">
              <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm3 10.6L9.6 12 8 10.4 6.4 12 5 10.6 6.6 9 5 7.4 6.4 6 8 7.6 9.6 6 11 7.4 9.4 9 11 10.6z" />
            </svg>
          </div>
          <div>
            <div className="mb-2">
              <div className="text-lg font-semibold text-slate-800">
                Eliminar pallet: {props.identifier}
              </div>
            </div>
            <div className="text-sm mb-10">
              <p className="text-black">
                ¿Estás seguro? Esta acción eliminará el pallet y todos sus componentes montados de forma permanente.
              </p>
            </div>
            <div className="flex flex-wrap justify-end space-x-2">
              <button
                className="btn-sm border-slate-200 hover:border-slate-300 text-slate-600"
                onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(false); }}
              >
                Cancelar
              </button>
              <button
                className="btn-sm bg-red-500 hover:bg-red-600 text-white"
                onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(false); handleDelete(); }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      </ModalBlank>

      {/* Danger Modal */}
      <div className="">
        {/* Start */}

        <ModalBlank
          id="danger-modal"
          modalOpen={dangerModalOpen}
          setModalOpen={isLoading ? () => {} : setDangerModalOpen}
        >
          <div className="p-5 flex space-x-4">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-secondary">
              <svg
                className="w-4 h-4 shrink-0 fill-current text-primary"
                viewBox="0 0 16 16"
              >
                <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
              </svg>
            </div>
            {/* Content */}
            <div>
              {/* Modal header */}
              <div className="mb-2">
                <div className="text-lg font-semibold text-slate-800">
                  Reprocesar: {props.identifier}
                </div>
              </div>
              {/* Modal content */}
              <div className="text-sm mb-10">
                <div className="space-y-2">
                  <p className="text-black">
                    ¿Estás seguro que deseas reprocesar el lote:{" "}
                    {props.identifier}? Esta acción enviará el lote de nuevo al sistema SAP.
                  </p>
                  {props.devMode && (
                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                      <p className="text-xs font-semibold text-amber-600">Parámetros Dev</p>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-500 w-20">Interface</label>
                        <input
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                          value={devInterface}
                          onChange={(e) => setDevInterface(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-500 w-20">Fase</label>
                        <input
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                          value={devFase}
                          onChange={(e) => setDevFase(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-500 w-20">Complemento</label>
                        <input
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                          value={devComplemento}
                          onChange={(e) => setDevComplemento(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Modal footer */}
              <div className="flex flex-wrap justify-end space-x-2">
                <button
                  className="btn-sm border-slate-200 hover:border-slate-300 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDangerModalOpen(false);
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  className="btn-sm bg-primary hover:bg-primary-500 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReprocess();
                  }}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <svg
                      className="animate-spin bg-transparent w-4 h-4 fill-current shrink-0 mr-2"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                    </svg>
                  )}
                  {isLoading ? "Reprocesando..." : "Si, reprocesar"}
                </button>
              </div>
            </div>
          </div>
        </ModalBlank>
        {/* End */}
      </div>
    </>
  );
}

export default LogsItem;
