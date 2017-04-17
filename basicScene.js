var lauras_obj = {
    "description":"Cube",
    "graphicsFramework":"Babylonjs",
    "vertices":[
        {"id":0, "position":[0,0,0]},
        {"id":1, "position":[0,0,5]},
        {"id":2, "position":[5,0,0]},
        {"id":3, "position":[5,0,5]},
        {"id":4, "position":[10,5,0]},
    ],
    "edges":[
        {"id":0, "v1":0, "v2":1},
        {"id":1, "v1":0, "v2":2},
        {"id":2, "v1":2, "v2":3},
        {"id":3, "v1":1, "v2":3},
        {"id":4, "v1":0, "v2":4},
        {"id":5, "v1":3, "v2":4},
    ]
}
/*
 * basicScene.js - A demonstrtion of some of the uses of yagl.
 *
 * Copyright 2016 - Bridgewater College
 */
var canvas = document.querySelector("#renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

var createScene = function () {
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color3.Gray();

    var camera = new BABYLON.ArcRotateCamera("camera1", Math.PI / 2, Math.PI / 2, 35, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, false);

    var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0.5), scene);
    light1.intensity = 1.0;

    builder = new YAGL.GraphBuilder(scene);

    var obj = createRandomYAGLGraphObject(4,4);
    builder.buildUsingJSONObj(obj);

    return scene;
};

var scene = createScene();

/*** EDIT NOTES ***/
function editNotes(html, textColor) {
	var notes = document.getElementById("notes");
	if (notes == null) {
		return;
	}
	notes.innerHTML = html;
	notes.style.color = textColor;
}

var html = "YAGL - Yet Another Graph Library";
editNotes(html, "darkgreen");

/*** BUILD GRAPH BUTTON ***/
var buildGraph = function () {
    var choice = prompt("Please enter build type:\n" +
                        "\t1: User Defined Size\n" +
                        "\t2: Random\n" +
                        "\t3: YAGL File");

    if (choice == 1) {
        var numVertices = Number(prompt("How Many Vertices?"));
        var maxEdges = (numVertices * (numVertices -1))/2;
        var numEdges = maxEdges + 1;

        while (numEdges > maxEdges) {
            numEdges = prompt("How Many Edges (less than or equal to " + maxEdges + "): ");
        }

        var obj = createRandomYAGLGraphObject(numVertices, numEdges);
        builder.buildUsingJSONObj(obj);
    } else if (choice == 2) {
        var obj = createRandomYAGLGraphObject();
        builder.buildUsingJSONObj(obj);
    } else {
      //var url = prompt("Please enter the URL.", "http://demo.yagljs.com/yagl_files/dodecahedron.yagl");
        //builder.buildUsingJSONFile(url);
        builder.buildUsingJSONObj(lauras_obj);
    }
};


/*** SLOW/FAST BUILD BUTTON ***/
var toggleBuildSpeed = function () {
    builder.setSlowBuild(!builder.getSlowBuild());

    button = document.getElementById("toggleBuildSpeed");
    var text = button.firstChild.nodeValue;
    button.firstChild.nodeValue = (text == "Slow Build") ? "Fast Build" : "Slow Build";
};

/*** GRAPH PROPERTIES BUTTON ***/
var graphProperties = function () {
    html = "Graph Properties <br><br>";
    html += graph.toHTMLString();
    editNotes(html, "darkgreen");
};

/*** ROTATE CAMERA ***/
var rotateCamera = true;
var step = Math.PI / 720;
var radius = 35;
var tick = 0;

var toggleCamera = function () {
    rotateCamera = rotateCamera ? false : true;

    button = document.getElementById("toggleCamera");
    var text = button.firstChild.nodeValue;
    button.firstChild.nodeValue = (text == "Rotate Camera") ? "Freeze Camera" : "Rotate Camera";
};

/*** RESET COLOR FOR ALL MESHES ***/
function resetMeshColor() {
    scene.meshes.forEach( function (m) {
        if (m.material == null) {
                console.log("new material");
                m.material = new BABYLON.StandardMaterial(m.name, scene);
        }
        m.material.diffuseColor = BABYLON.Color3.White();
    });
}

/*** ONPOINTERDOWN CALLBACK ***/
var currentAction = "none";
var selectedMeshes = [];

scene.onPointerDown = function (evt, pickResult) {
    if (currentAction == "none" && pickResult.hit) {

        var type = pickResult.pickedMesh.name[0];
        var id = Number(pickResult.pickedMesh.name.slice(1));

        if (type == "v") {

            if(graph.vertices[id].data != undefined){
                html = "Vertex " + id + ": " + graph.vertices[id].data + "<br>";
            } else {
                var aDC = actorDegreeCentrality(id);
                var aCC = actorCloseCentrality(id);
                //actorBTCentrality(id);
                html = "Vertex " + id + " no data" + "<br>" +
                        "Actor Degree Centrality " + aDC + "<br>" +
                        "Actor Closeness Centrality " + aCC + "<br>";
            }
        } else {
            html = "Edge " + id + "<br>";
        }
        editNotes(html, "darkgreen");

    }

    if (currentAction == "findPath" && pickResult.hit && pickResult.pickedMesh.name.startsWith("v")) {
        if (selectedMeshes.length == 0) {
            selectedMeshes.push(pickResult.pickedMesh.name.substr(1));
            pickResult.pickedMesh.material.diffuseColor = BABYLON.Color3.Green();
            editNotes("Pick target vertex", "darkgreen");
        }
        else if (selectedMeshes.length == 1 && pickResult.hit && pickResult.pickedMesh.name.startsWith("v")) {
            selectedMeshes.push(pickResult.pickedMesh.name.substr(1));
            pickResult.pickedMesh.material.diffuseColor = BABYLON.Color3.Green();

            path = graph.getPath(Number(selectedMeshes[1]), Number(selectedMeshes[0]));

            if (path == null ) {
                html = "No path exists" + "<br>";
            } else {
                html = "Path:  " + path + "<br>";
            }
            editNotes(html, "darkgreen");

            pathIndex = 0;
            animatePath();
            currentAction = "none";
        }
    }
};

/*** SHORTEST PATH BUTTON ***/
var findPath = function () {
    resetMeshColor();
    currentAction = "findPath";
    editNotes("Pick source vertex", "darkgreen");
    selectedMeshes = [];
    // pick() recognizes a vertex was picked and takes over from here.
};

var pathIndex = 0;
var path = null;

function animatePath() {
    if (path == null) {
        return;
    }

    var vid = path[pathIndex];
    graph.vertices[vid].mesh.material.diffuseColor = BABYLON.Color3.Magenta();

    pathIndex++;

    if (pathIndex == path.length) {
        var audio = new Audio('ding.mp3');
        audio.volume = 0.25;
        audio.play();
        return;
    }

    setTimeout(animatePath, 1000);
}

/*** COLOR COMPONENTS BUTTON ***/
var colorComponents = function() {
    var vid;
    for (vid in graph.vertices) {
        var v = graph.vertices[vid];
        if (v.mesh.material == null) {
            v.mesh.material = new BABYLON.StandardMaterial(v.vid, scene);
        }
    }

    if (graph.isConnected()){
        var color = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        var vid;
        for(vid in graph.vertices){
            graph.vertices[vid].mesh.material.diffuseColor = color;
        }
    } else {
        var headVids = [];
        var colorSet = {};
        var find = "";
        for(vid in graph.vertices) {
            find = "";
            find += graph.findComponent(vid);

            if (colorSet.hasOwnProperty(find) == false) {
                colorSet[find] = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
            }

            graph.vertices[vid].mesh.material.diffuseColor = colorSet[find];
        }
    }
};

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    scene.render();

    if (rotateCamera == true) {
        var x = radius * Math.sin(step * ++tick);
		var z = radius * Math.cos(step * tick);
		var y = 7;
		scene.activeCamera.setPosition(new BABYLON.Vector3(x,y,z));
    }

});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
    engine.resize();
});

function actorDegreeCentrality(id) {
    var hm = graph.getAllEdgeCounts();
    var vertexEdge;
    var g = Object.keys(hm).length;
    var actorDC = 0;

    for(var k in hm) {
      if(id == k){
        vertexEdge = hm[k];
      }
    }
    actorDC = vertexEdge/(g-1);
    return actorDC;
}

function degreeCentrality(){
    var hm = graph.getAllEdgeCounts();
    var largest = returnLargestNode(hm);
    var numerator = 0;
    var denomiator = 0;
    var degreeCentrality = 0;

    for(var k in hm) {
      var actor = actorDegreeCentrality(hm[k]);
      var add = largest - actor;
      numerator += add;
    }
    denominator = (Object.keys(hm).length - 2) * (Object.keys(hm).length - 1);
    //get value for degree centrality
    degreeCentrality = (numerator / denominator).toFixed(2);
    //check if centrality is a number
    if(isNaN(degreeCentrality)){
      alert('No degree centrality');
    }
    else {
      alert('The Degree Centrality is ' + degreeCentrality);
    }
    return degreeCentrality;
}
  function actorCloseCentrality(id) {
    var hm = graph.getAllEdgeCounts();
    var g = Object.keys(hm).length;
    var paths = {};
    var actorCC = 0;
        var sum = 0;
        //finds path from nodei to every other
        for(j = 0; j < g; j++) {
          if(id!=j){
            var d = graph.getPath(id, j);
            //calculates the total number of paths for node i
            for(k = 0; k < d.length; k++){
              if(j != d[k])
                sum++;
              }
            }
          }
      actorCC = ((1/ sum) * (g-1));  //sets node with inverse of total # of paths to hm
      return actorCC;
  }

  function closenessCentrality() {
    //GRAPH MUST BE CONNECTED
    if(graph.isConnected()) {
      var hm = graph.getAllEdgeCounts();
      var paths = {};
      var maxcloseness = null;
      var numerator = 0;
      var g = Object.keys(hm).length;
      var denominator = 0;
      var closenessCentrality =0;
      var i;
      for(i=0; i <g; i++){
          paths[i] = actorCloseCentrality(i);
      }
      //finds the max closeness node
      for(var k in paths) {
          if(paths.hasOwnProperty(k)){
            if(paths[k] > maxcloseness || maxcloseness == 'null') {
              maxcloseness = paths[k];
            }
          }
      }

      for(var k in paths) {
        var add = maxcloseness - paths[k];
        numerator += add;
      }
      denominator = ((g-2)*(g-1)) / ((2*g) - 3);
      closenessCentrality = numerator / denominator;
      alert('Closeness centrality is  ' + closenessCentrality);
    }
    else {
      alert("cannot compute if not connected");
      }
  }
/*function actorBTCentrality(id) {
  var hm = graph.getAllEdgeCounts();
    var g = Object.keys(hm).length;
    var sum = 0;
    //finds path from nodei to every other
  //  for(var j = 0; j < g; j++) {
    //  for(var k = 0; k < j; k++){
      //    if(j!=k){
        //     console.log("Paths between: " + j + " "+ k);
              var path = graph.BFSearch(1,4);
              //var paths = graph.getPath(4,1);
              //console.log("path 1 " + path);
              //console.log("path 2 " + paths);
        //  }
        //}
      //}
      console.log("----");
    //  paths[i] = sum;  //sets node with inverse of total # of paths to h
}
function btCentrality() {
  var hm = graph.getAllEdgeCounts();
  var numerator = 0;
  var denominator = 0;
  var largest = 0;
  var g = Object.keys(hm).length;
  var paths = {};
  var linking; //gjk
  var containing; //gjk(ni)

  var denominator = [Math.pow(g/2, 2)] * (g-2);
  console.log("Denom = " + denominator);


  //loops paths for certain node
  for(var i = 0; i < g; i++) {
    var sum = 0;
    //finds path from nodei to every other
    for(var j = 0; j < g; j++) {
      for(var k = 0; k < g; k++){
          if(j!=k){
            console.log("Paths between: " + j + " "+ k);
            linking = graph.BFSearch(j,k);
            if(linking != 0){
              var path = graph.getPath(j,k);
              var contain_i = checkContain(i, path);
              var actor_between= contain_i/linking;
              console.log("actor between: " + actor_between);
            }
          }
        }
      }
      console.log("----");
    }

    //  paths[i] = sum;  //sets node with inverse of total # of paths to hm
}
function checkContain(index, path){
  var contains = 0;
  for(var i = 0; i <path.length; i++){
    if(path[i] == index){
      contains++;
    }
  }
  return contains;
}
*/
/* returnLargestNode() takes hashmap of nodes with edges
 * returns the node with the largest amount of edges *
 */
function returnLargestNode(hm) {
  var largest = actorDegreeCentrality(hm[0]);
  for(var k in hm) {
        if(actorDegreeCentrality(hm[k]) > largest) {
          largest = actorDegreeCentrality(hm[k]);
        }
    }
  return largest;
}
