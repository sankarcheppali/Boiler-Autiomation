
let wssrv="ws://localhost:4084";
let boilerID = "367"
// Load the Visualization API and the corechart package.
 google.charts.load('current', {'packages':['corechart']});
 // Set a callback to run when the Google Visualization API is loaded.
 google.charts.setOnLoadCallback(chartsReady);
 let temperatureChartData ;
 let realyChartData;
 function chartsReady(){
    temperatureChartData = google.visualization.arrayToDataTable([
        ['Time', 'Temperature','hc','lc'],
        ['10:23:11',25,30,40]
      ]);
      realyChartData= google.visualization.arrayToDataTable([
        ['Time', 'Realy'],
        ['10:23:11',1]
      ]);
    //drawChart(temperatureChartData)
    openWs();
 }

function updateCharts(boardStatus){
    let temperature = Math.round(((4096/3300)*boardStatus.tSensor)/10 * 100) / 100
    let relayStatus = boardStatus.relay
    let {hc,lc} = boardStatus.setpoint
    let date = new Date()
    let timeString = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    temperatureChartData.addRow([timeString,temperature,hc,lc])
    realyChartData.addRow([timeString,relayStatus])
    if(temperatureChartData.getNumberOfRows() > 20){
        temperatureChartData.removeRow(0)
    }
    if(realyChartData.getNumberOfRows() > 20){
        realyChartData.removeRow(0)
    }
    drawChart(temperatureChartData,realyChartData)
    $("#temperature_holder").text(temperature) 
    $("#boiler_status_holder").text(relayStatus ? 'On' : 'Off')
} 
function drawChart(data,realyData) {
      var temperatureChatOptions = {
        title: 'Boiler Temperature',
        curveType: 'function',
        legend: { position: 'bottom' },
        animation:{
            duration: 500,
            easing: 'out',
          },
        hAxis:{
          showTextEvery:5,
        },
        vAxis:{
            minValue:15, 
            maxValue:35,
        },
      };// vAxis: {minValue:0, maxValue:1000}
      let relayChartOptions = {
        title: 'Realy',
        vAxis: {title: 'Status'},
        legend: { position: 'bottom' },
        hAxis:{
            showTextEvery:5,
        },
        vAxis:{
            minValue:0, 
            maxValue:1,
        },
      };
      let temperatureChart = new google.visualization.LineChart(document.getElementById('temperature_chart_div'));
      temperatureChart.draw(data, temperatureChatOptions);
      let realyChart = new google.visualization.SteppedAreaChart(document.getElementById('relay_chart_div'));
      realyChart.draw(realyData, relayChartOptions);
}

let ws;
function openWs(){
    ws = new WebSocket(wssrv);
    ws.onopen = function (event) {
       console.log('ws is opened');    
       var msg={requestType:'monitor',id:boilerID}; 
       ws.send(JSON.stringify(msg)); 
    };
    ws.onmessage = function (event) {
		console.log('message on ws: '+event.data);
        var msg = JSON.parse(event.data);
        updateCharts(msg)
     }
    ws.onclose=function(){
         console.log(" ws is closed");
         ws= null;
         setTimeout(openWs,1000)
    }
    ws.onerror=function(err){
        console.log("Somthing went worng in websocket connection "+err);
        //openWs();
    }
}


$("#saveSetPoint").on('click',async ()=>{
    console.log('updating setpoints')
    let lc = parseFloat( $("#lc_input").val())
    let hc = parseFloat( $("#hc_input").val())
    let data = {id:boilerID,setpoint:{lc,hc}}
    let res = await postData({url:'/boiler/update',reqBody:data})
    console.log(`setpoint update resutl ${res.success}`)
})

async function postData({url,reqBody,token}){
    let nop=await  fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "x-access-token":token
            // "Content-Type": "application/x-www-form-urlencoded",
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        body: JSON.stringify(reqBody), // body data type must match "Content-Type" header
    })
    return await nop.json()
}