# ESB_ACE12_UtilizacionCreditoRotativoPlus.


## INFORMACIÓN DEL SERVICIO

El presente documento expone de manera detallada la funcionalidad y componentes del flujo, UtilizacionCreditoRotativoPlus, y su operación utilizarCredito. Este servicio recibe una petición desde el sistema consumidor (IVR ALO, PB, BM ó CANALES) e interactúa con los sistemas legados AC y FlexCube finalmente devuelve una respuesta al consumidor. 


### Último despliege

|CQ |JIRA | Fecha|
|---|---|---|
| NA |NA |6/10/2023 (WS) | 

## Procedimiento de despliegue

Aplicar UtilizacionCreditoRotativoPlus.properties a UtilizacionCreditoRotativoPlus.bar y desplegar en los grupos de ejecución:
BOGESERVICIOSWS05_SRV01 BOGESERVICIOSWS05_SRV02 BOGESERVICIOSTCP01_SRV01 BOGESERVICIOSTCP01_SRV02


## ACCESO AL SERVICIO
 
### DataPower Externo :

No aplica
<br><br>

### DataPower Interno :
|AMBIENTE|TIPO COMPONENTE|NOMBRE WSP O MPG|DATAPOWER|ENDPOINT|
|---|---|---|---|---|
|DESARROLLO|WSP|WSServicioPilotoATHInterno|BODPDEV|https://boc201.des.app.bancodeoccidente.net:4806/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|CALIDAD|WSP|WSServicioPilotoATHInterno|BODPQAS|https://boc201.testint.app.bancodeoccidente.net:4806/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|PRODUCCION|WSP|WSServicioPilotoATHInterno|BODPPRD|https://boc201.prdint.app.bancodeoccidente.net:4806/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|

<br><br>


### Endpoint BUS 

|AMBIENTE|    NODO/GE    |ENDPOINT|
|---|----------|---|
|DESARROLLO|BOGESERVICIOSWS05_SRV01|https://adbog162e.bancodeoccidente.net:4907/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|DESARROLLO|BOGESERVICIOSWS05_SRV02|https://adbog162e.bancodeoccidente.net:4908/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|CALIDAD|N1-BOGESERVICIOSWS05_SRV01|https://atbog163d.bancodeoccidente.net:4907/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|CALIDAD|N1-BOGESERVICIOSWS05_SRV02|https://atbog163d.bancodeoccidente.net:4908/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|CALIDAD|N2-BOGESERVICIOSWS05_SRV01|https://atbog164e.bancodeoccidente.net:4907/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|CALIDAD|N2-BOGESERVICIOSWS05_SRV02|https://atbog164e.bancodeoccidente.net:4908/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|
|PRODUCCION|BOGESERVICIOSWS05_SRV01<br>BOGESERVICIOSWS05_SRV02|https://boc060ap.prd.app.bancodeoccidente.net:4907/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort<br> https://boc060ap.prd.app.bancodeoccidente.net:4908/UtililzacionCreditoRotativoPlusService/UtililzacionCreditoRotativoPlusPort|

<br><br>		
## CANALES - APLICACIONES

 
|||||
|---|---|---|---|
|**Consumidor**|CANALES|PB|IVR|
 
|||||
|---|---|---|---|
|**Backends**|NA|||
 
## DEPENDENCIAS
|Servicios|
|---|
|CacheHomologacionTipos_StaticLib|
|ConsultaCupoCarteraPaqueteCaller|
|GeneradorSecuenciaESBCaller|
|IntegracionACCaller|
|IntegracionFCCaller|
|IntegracionWSCaller|
|MessageSet_017_StaticLib|
|Util|
||
 
 
|XSL|
|---|
|REQ_ACOperacion_017.xsl|
|REQ_ACOperacion_277.xsl|
|REQ_FCUBSRTService_CreateTransaction_656.xsl|
|RES_FCUBSRTService_CreateTransaction|
|RES_ACOperacion_017|
|RES_ACOperacion_277|
||
 		
 
## DOCUMENTACION

**Documento de diseño detallado:** <br>
 https://bancoccidente.sharepoint.com/:f:/r/sites/BibliotecaAplicaciones/Documentos%20compartidos/60-IBM%20Integration%20BUS/2.%20Dise%C3%B1o%20y%20Desarrollo/ESB_ACE12_UtilizacionCreditoRotativoPlus

**Mapeo:**   <br>
 https://bancoccidente.sharepoint.com/:f:/r/sites/BibliotecaAplicaciones/Documentos%20compartidos/60-IBM%20Integration%20BUS/2.%20Dise%C3%B1o%20y%20Desarrollo/ESB_ACE12_UtilizacionCreditoRotativoPlus

**Evidencias (Unitarias/Auditoria/Monitoreo):**      <br>
 https://bancoccidente.sharepoint.com/:f:/r/sites/BibliotecaAplicaciones/Documentos%20compartidos/60-IBM%20Integration%20BUS/2.%20Dise%C3%B1o%20y%20Desarrollo/ESB_ACE12_UtilizacionCreditoRotativoPlus

**WSDL:** <br>
git\ESB_ACE12_UtilizacionCreditoRotativoPlus\Broker\WSDL\wsdl\UtililzacionCreditoRotativoPlus.wsdl  


		
## SQL
Filtrar por cola del servicio
```
select *
from admesb.ESB_LOG_AUDITORIA
where 1 = 1
--and str_id_oper_apl_origen like '%ListenerB24_PeticionMQ' and str_msg_error like '%MQ_TrfrnciaCuentaDestino_IN%'
```
Filtrar por P3
```
select *
from admesb.ESB_LOG_AUDITORIA
where 1 = 1
--or str_id_oper_apl_origen like '%ListenerB24_PeticionTCP' and str_msg_error like '%cnx:AT15%402020%'
--or str_id_oper_apl_origen like '%ListenerB24_PeticionTCP' and str_msg_error like '%cnx:AT15%402010%'
--or str_id_oper_apl_origen like '%ListenerB24_PeticionTCP' and str_msg_error like '%cnx:AT15%401020%'
--or str_id_oper_apl_origen like '%ListenerB24_PeticionTCP' and str_msg_error like '%cnx:AT15%401010%'
```
Filtrar por Codigo de Operacion
```
* select * from admesb.esb_log_auditoria      where num_id_tipo_operacion = '999042'  
* select * from admesb.esb_log_auditoria      where num_id_tipo_operacion = '999042'  
```
