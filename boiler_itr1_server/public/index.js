let mqqtHost = 'iot.eclipse.org'
let mqqtPort = 443

// Load the Visualization API and the corechart package.
 google.charts.load('current', {'packages':['corechart']});
 // Set a callback to run when the Google Visualization API is loaded.
 google.charts.setOnLoadCallback(chartsReady);
 let temperatureChartData ;
 let realyChartData;
 function chartsReady(){
    temperatureChartData = google.visualization.arrayToDataTable([
        ['Time', 'Temperature'],
        ['10:23:11',25]
      ]);
      realyChartData= google.visualization.arrayToDataTable([
        ['Time', 'Realy'],
        ['10:23:11',1]
      ]);
    //drawChart(temperatureChartData)
    connectMQ(mqqtHost,mqqtPort,"","")
 }
 
function updateCharts(boardStatus){
    let temperature = Math.round(((4096/3300)*boardStatus.tSensor)/10 * 100) / 100
    let relayStatus = boardStatus.relay
    let date = new Date()
    let timeString = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    temperatureChartData.addRow([timeString,temperature])
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
            maxValue:35
        },
      };// vAxis: {minValue:0, maxValue:1000}
      let relayChartOptions = {
        title: 'Boiler Status',
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

function connectMQ(host,port,username,password){
    var clientId = "ws" + Math.random();
        var client = new Paho.MQTT.Client(host, parseInt(port), clientId);
        client.onConnectionLost = onConnectionLost;
        client.onMessageArrived = onMessageArrived;
        let connected = false
        // connect the client
        client.connect({
          useSSL: true,
          userName: username,
          password: password,
          onSuccess: onConnect,
          onFailure: onFailure
        });

        function onConnect() {
          // Once a connection has been made, make a subscription and send a message.
          console.log("onConnect");
          connected = true;
          client.subscribe("/ic/ha/from/esp32/");
          //updateUI();
        }
        function onConnectionLost(responseObject) {
            connected=false
            console.log("onConnectionLost:", responseObject.errorMessage);
            connectMQ(host,port,username,password)
        }
        function onFailure(invocationContext, errorCode, errorMessage) {
            connected=false
          var errDiv = document.getElementById("error");
          console.log( "Could not connect to WebSocket server, most likely you're behind a firewall that doesn't allow outgoing connections");
          //updateUI();
        }
        
	    function sendUpdate(data){
            let message = new Paho.MQTT.Message(JSON.stringify(data));
            message.destinationName = "/ic/ha/to/esp32/";
            client.send(message);
        }
        function onMessageArrived(message) {
          let msg=message.payloadString;
          console.log(msg);
          let boardStatus  = JSON.parse(msg)
          updateCharts(boardStatus )
        }
        $("#relayOffBtn").on('click',()=>{
            console.log('Switch off boiler')
            sendUpdate({"switches":[{status:false,id:1}]})
        })
        
        $("#relayOnBtn").on('click',()=>{
            console.log('Switch on boiler')
            sendUpdate({"switches":[{status:true,id:1}]})
        })
}
