import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import InputLabel from "@material-ui/core/InputLabel";
import Input from "@material-ui/core/Input";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { Print_Service } from "./printService";
import { useSelector } from "react-redux";
import {
  selectSelectedAccessories,
  selectSelectedProduct,
  selectQrCode,
} from "./store/slice/productSlice";
const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    "& button": {
      flexBasis: "70%",
      margin: "2%",
      backgroundColor: "rgb(0 155 74 / var(--tw-bg-opacity))",
      color: "white",
      "&:hover": {
        backgroundColor: "rgb(0 120 56 / var(--tw-bg-opacity))",
      },
    },
  },
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  formControl: {
    marginTop: "5%",
    marginBottom: "7%",
    minWidth: 140,
  },
}));

export default function PrinterComponent() {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [deviceList, setDevices] = React.useState([]);
  const [printer, setPrinter] = React.useState(null);
  const [zebraPrinter, setZebraPrinter] = React.useState(null);
  //const selectedProduct = useSelector(selectSelectedProduct);
  //const selectedAccessories = useSelector(selectSelectedAccessories);
  //const qrCode = useSelector(selectQrCode);

  //console.log("selectedProductPrinter", selectedProduct);
  //console.log("qrCode", qrCode);

  useEffect(() => {
    window.BrowserPrint.getLocalDevices(
      function (deviceList) {
        setDevices(deviceList.printer);
      },
      (err) => {
        console.log(err);
      }
    );
  }, []);

  const handleChange = (event) => {
    setPrinter(event.target.value);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleStatusCheck = () => {
    // printer.getConfiguration(function (status) {
    //   console.log(status.getMessage())
    // }, function (error) {
    //   console.error("***Error**** ", error)
    // })
  };

  const writeIframe = (str) => {
    var doc = document.getElementById("info").contentWindow.document;
    doc.open();
    doc.write(str);
    doc.close();
  };

  const handleList = () => {
    let str = "";
    deviceList.map((device) => {
      str += `<li>${device.name}</li>`;
    });
    writeIframe(str);
  };

  const checkConfig = () => {};

  function formatZPLDate(date) {
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, "0");
    let day = date.getDate().toString().padStart(2, "0");
    let hours = date.getHours().toString().padStart(2, "0");
    let minutes = date.getMinutes().toString().padStart(2, "0");
    let seconds = date.getSeconds().toString().padStart(2, "0");
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

   const handlePrintAccesories = () => {
    console.log("selectedAccessories", selectedAccessories);
    const selectedAccessoriesJson = JSON.parse(selectedAccessories);
    if ( selectedAccessoriesJson == null )
      alert("No es posible generar etiqueta de Accesorios, el producto no tiene relacion");
    else{
    console.log(selectedAccessoriesJson[0].matnr);
    let currentDateZPL = formatZPLDate(new Date(Date.now()));

    let networkCallResponse = `
   ^XA

^FO380,900^GFA,1136,1136,8,,O07FC,N01IF,N07IFC,N07IFE,N0FCF3E,N0F071F,M01E070F,M01E0707,:M01C0707,:M01E0707,M01E070F,N0E073F,N0F07FE,N0E07FC,P07F8,P01E,,:N0JFC,M01JFE,M01KF,:N0BJF,R0F,CQ07,18P07,03P07,006O0F,I0CN0F,I0F8L01F,003FEL03E,00FFE001JFE,01FFE001JFC,07FFE001JFE,1IFE001JFE,3IFEM0F,JFEM0F,JF8M07,JFN07,IFCN0F,IFO0F,FFEO0F,FF8N01F,0FO0FE,01K01JFE,E02K0JFC,FC06I01JF8,FF80CI0IF8,IF,:IF1C,IF1EI0MF,3FF1E001MF,03F1E001MF,4071E001MF,F801E001EI0F,FF00E001CI0F,FFEJ01CI07,IFJ01CI07,:IFJ01EI07,IFJ01EI0F,8FFK0EI0F,81FK0F001F,F01K0FC07E,FEL07IFE,FFDK03IFC,IF8J01IF8,JFK07FE,JFE,:1IFE,03FFE001JFE,E03FE001KF,FC07E001KF,FF80E001KF,FFEO0F,IFO07,:::87FO07,82FO07,801K03F805,83L07FC,83FK0FFE,83FK0FFE07,83FJ01F0F07,83FJ01E0F07,03FJ01C0707,:01FJ01C0707,E03J01C0707,FCK01C070F,FF8J01E070F,IFJ01E0F1F,IFK0JFE,:IFK0JFC,DFFK07IF,83F,807,801,8N07FC,8M03IF,8M07IF8,8M07IFC,8M0FC07E,N0F001F,M01EI0F,:M01EI07,::M01EI0F,:N0FI0E,:N0F8,N07F,N03FFC,N01IF,O07FFC,N041FFC,N0E007E,N0F001F,M01EI0F,M01EI07,:::M01EI0F,N0FI0F,N0F803E,N0JFE,N07IFC,N03IF8,O0FFE,P04,^FS


^FWR  ; Rotar todo el contenido 90 grados en sentido horario

^FO50,50^GB400,1100,2^FS  ; Dibuja el recuadro de 4x11 cm (400x1100 en unidades ZPL)

; Dibuja las líneas horizontales para dividir el recuadro en 5 partes
^FO100,400^GB240,2,2^FS   ; Línea horizontal 1
^FO100,600^GB240,2,2^FS   ; Línea horizontal 1
^FO100,900^GB240,2,2^FS   ; Línea horizontal 1
^FO100,1100^GB240,2,2^FS   ; Línea horizontal 1

; Dibuja las líneas verticales para dividir el recuadro en 3 partes
^FO100,400^GB2,700,2^FS    ; Línea vertical 1
^FO140,400^GB2,700,2^FS    ; Línea vertical 2
^FO180,400^GB2,700,2^FS    ; Línea vertical 3
^FO220,400^GB2,700,2^FS    ; Línea vertical 4
^FO260,400^GB2,700,2^FS    ; Línea vertical 5
^FO300,400^GB2,700,2^FS    ; Línea vertical 6
^FO340,400^GB2,700,2^FS    ; Línea vertical 7


; Agrega texto en cada sección
^FO350,90^A0R,20,20^FD^FS
^FO380,60^A0R,50,50^FDProducto^FS

^FO300,450^A0R,25,25^FDSKU^FS
^FO260,420^A0R,30,30^FD${selectedAccessoriesJson[0].matnr}^FS
^FO220,420^A0R,30,30^FD${selectedAccessoriesJson[1].matnr}^FS
^FO180,420^A0R,30,30^FD${selectedAccessoriesJson[2].matnr}^FS
^FO140,420^A0R,30,30^FD${selectedAccessoriesJson[3].matnr}^FS
^FO100,420^A0R,30,30^FD${selectedAccessoriesJson[4].matnr}^FS

^FO300,670^A0R,25,25^FDCOMPONENT^FS
^FO260,610^A0R,25,25^FD${selectedAccessories[0].maktx}^FS
^FO220,610^A0R,25,25^FD${selectedAccessories[1].maktx}^FS
^FO180,610^A0R,25,25^FD${selectedAccessories[2].maktx}^FS
^FO140,610^A0R,25,25^FD${selectedAccessories[3].maktx}^FS
^FO100,610^A0R,25,25^FD${selectedAccessories[4].maktx}^FS

^FO300,940^A0R,25,25^FDQUANTITY^FS
^FO260,910^A0R,25,25^FD${selectedAccessories[0].quantity}^FS
^FO220,910^A0R,25,25^FD${selectedAccessories[1].quantity}^FS
^FO180,910^A0R,25,25^FD${selectedAccessories[2].quantity}^FS
^FO140,910^A0R,25,25^FD${selectedAccessories[3].quantity}^FS
^FO100,910^A0R,25,25^FD${selectedAccessories[4].quantity}^FS
; Agrega el código QR en la parte derecha
^FO100,100^BQN,6,6
^FDQA,#CODIGO1|CODIGO1|CODIGO1|CODIGO1|CODIGO1|CODIGO1|CODIGO1|CODIGO1|CO2|^FS

^XZ
    
    `;
  }
    Print_Service.print(printer, networkCallResponse);
  };

  const handlePrint = () => {
    console.log(".... HANDLE PRINT FUNCTION ... .");
    console.log("selectedProduct:", selectedProduct);
    console.log("selectedAccessories", selectedAccessories);
    let currentDateZPL = formatZPLDate(new Date(Date.now()));
   
    let networkCallResponse = `
    ^XA

    ^FO380,130^GFA,1136,1136,8,,O07FC,N01IF,N07IFC,N07IFE,N0FCF3E,N0F071F,M01E070F,M01E0707,:M01C0707,:M01E0707,M01E070F,N0E073F,N0F07FE,N0E07FC,P07F8,P01E,,:N0JFC,M01JFE,M01KF,:N0BJF,R0F,CQ07,18P07,03P07,006O0F,I0CN0F,I0F8L01F,003FEL03E,00FFE001JFE,01FFE001JFC,07FFE001JFE,1IFE001JFE,3IFEM0F,JFEM0F,JF8M07,JFN07,IFCN0F,IFO0F,FFEO0F,FF8N01F,0FO0FE,01K01JFE,E02K0JFC,FC06I01JF8,FF80CI0IF8,IF,:IF1C,IF1EI0MF,3FF1E001MF,03F1E001MF,4071E001MF,F801E001EI0F,FF00E001CI0F,FFEJ01CI07,IFJ01CI07,:IFJ01EI07,IFJ01EI0F,8FFK0EI0F,81FK0F001F,F01K0FC07E,FEL07IFE,FFDK03IFC,IF8J01IF8,JFK07FE,JFE,:1IFE,03FFE001JFE,E03FE001KF,FC07E001KF,FF80E001KF,FFEO0F,IFO07,:::87FO07,82FO07,801K03F805,83L07FC,83FK0FFE,83FK0FFE07,83FJ01F0F07,83FJ01E0F07,03FJ01C0707,:01FJ01C0707,E03J01C0707,FCK01C070F,FF8J01E070F,IFJ01E0F1F,IFK0JFE,:IFK0JFC,DFFK07IF,83F,807,801,8N07FC,8M03IF,8M07IF8,8M07IFC,8M0FC07E,N0F001F,M01EI0F,:M01EI07,::M01EI0F,:N0FI0E,:N0F8,N07F,N03FFC,N01IF,O07FFC,N041FFC,N0E007E,N0F001F,M01EI0F,M01EI07,:::M01EI0F,N0FI0F,N0F803E,N0JFE,N07IFC,N03IF8,O0FFE,P04,^FS

    ^FWR  ; Rotar todo el contenido 90 grados en sentido horario
    
    ^FO50,50^GB400,1100,2^FS  ; Dibuja el recuadro de 4x11 cm (400x1100 en unidades ZPL)
    
    ; Dibuja las líneas horizontales para dividir el recuadro en 5 partes
    ^FO130,50^GB2,1100,2^FS   ; Línea horizontal 1
    ^FO210,50^GB2,720,2^FS   ; Línea horizontal 2
    ^FO290,50^GB2,720,2^FS   ; Línea horizontal 3
    ^FO370,50^GB2,720,2^FS   ; Línea horizontal 4
    
    ; Dibuja las líneas verticales para dividir el recuadro en 3 partes
    ^FO50,393^GB400,2,2^FS    ; Línea vertical 1
    ^FO50,780^GB400,2,2^FS    ; Línea vertical 2
    ^FO220,625^GB80,2,2^FS    ; Línea vertical 2
    
    ; Agrega texto en cada sección
    ^FO60,60^A0R,20,20^FDSTORAGE TEMPERATURE^FS
    ^FO80,60^A0R,40,35^FD${selectedProduct.storage_temp}^FS
    ^FO60,400^A0R,20,20^FDAPODACA, NL^FS
    ^FO80,400^A0R,40,40^FDMexico^FS
    ^FO60,800^A0R,20,20^FDHECHO - MANUFACTURING^FS
    ^FO80,800^A0R,40,20^FD${currentDateZPL}^FS
    
    ^FO140,60^A0R,15,15^FDCODIGO EMBRACO PARTNUMBER^FS
    ^FO160,60^A0R,40,40^FD${selectedProduct.matnr}^FS
    ^FO140,400^A0R,15,15^FDVOLTAGE / FRECUENCIA - VOTAGE / FREQUENCY^FS
    ^FO160,400^A0R,40,40^FD${selectedProduct.voltage}^FS
    
    ^FO220,60^A0R,15,15^FDPOTENCIA WATS^FS
    ^FO240,60^A0R,40,40^FD${selectedProduct.potencia}^FS
    ^FO220,400^A0R,15,15^FDCORRIENTE - CURRENT^FS
    ^FO240,400^A0R,40,40^FD${selectedProduct.corrente}E^FS
    ^FO220,630^A0R,15,15^FDIP RATING^FS
    ^FO240,630^A0R,40,40^FD${selectedProduct.iprating}^FS
    
    ^FO300,60^A0R,20,20^FDSPEED ORIENTATION^FS
    ^FO320,60^A0R,40,40^FD${selectedProduct.speed_conf}^FS
    ^FO300,400^A0R,20,20^FDSPEED ROTATION^FS
    ^FO320,400^A0R,40,40^FD${selectedProduct.speed_rot}^FS
    
    ^FO380,60^A0R,20,20^FD^FS
    ^FO400,60^A0R,40,40^FD^FS
    ^FO380,400^A0R,20,20^FDMODELO^FS
    ^FO400,400^A0R,40,35^FD${selectedProduct.modelo}^FS
    ^FO380,686^A0R,20,20^FD^FS
    ^FO400,686^A0R,40,40^FD^FS
    
    ; Agrega el código QR en la parte derecha
    ^FO150,800^BQN,3,3
    ^FDQA,${qrCode}^FS
    
    ^XZ
    
    `;
    Print_Service.print(printer, networkCallResponse);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <FormControl className={classes.formControl}>
        <InputLabel id="demo-dialog-select-label">Impresoras</InputLabel>
        <Select
          labelId="demo-dialog-select-label"
          id="demo-dialog-select"
          value={printer}
          onChange={handleChange}
          input={<Input />}
          MenuProps={{
            getContentAnchorEl: null,
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "left",
            },
            transformOrigin: {
              vertical: "top",
              horizontal: "left",
            },
            PaperProps: {
              style: {
                color: "black",
              },
            },
          }}
        >
          {deviceList.map((device, indx) => (
            <MenuItem
              value={device}
              key={indx}
              style={{ color: "black" }} // Establece el color del texto en negro
            >
              {device.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <div className={classes.root}>
        <Button
          onClick={handlePrintAccesories}
          className={
            "w-64 h-12 rounded text-base flex justify-center hover:bg-green-500"
          }
          variant="contained"
          disabled={!printer}
        >
          Imprimir Accesorios
        </Button>
      </div>
      <div className={classes.root}>

      </div>
    </>
  );
}
