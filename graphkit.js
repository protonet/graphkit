//* ------------------------------------------------- */
/* Vertex class */

var Vertex = function(x, y) {
  this.x = x;
  this.y = y;
};

Vertex.prototype.sum = function(v) {
  return new Vertex(this.x + v.x, this.y + v.y);
};

Vertex.prototype.diff = function(v) {
  return new Vertex(this.x - v.x, this.y - v.y);
};

Vertex.prototype.prod = function(scalar) {
  return new Vertex(this.x * scalar, this.y * scalar);
};

Vertex.prototype.quot = function(scalar) {
  return new Vertex(this.x / scalar, this.y / scalar);
};

Vertex.prototype.len = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vertex.prototype.scale = function(len) {
  return this.norm().prod(len);
};

Vertex.prototype.norm = function() {
  return this.quot(this.len());
};

Vertex.prototype.dot = function(v) {
  return (this.x * v.x + this.y * v.y);
};

Vertex.prototype.inverse = function() {
  return this.prod(-1.0);
};

/* ------------------------------------------------- */
/* Graph Node class */

var Node = function(number, info) {
  this.number   = number;
  this.info     = info;
  this.position = new Vertex(Math.random() * 100, Math.random() * 100);
  this.disp     = new Vertex(0, 0);
  this.mass     = 500.0;
};

Node.prototype.render = function(paper, small) {
  var visual = paper.set();

  var is_small = small && this.info.type == 'client';

  if (!is_small) {    
    var name = this.info.name;
    if (name.length > 10)
      name = name.substr(0,5)+'...'+name.substr(name.length-7,5);
  
    var title = paper.text(this.position.x, this.position.y, name);
    title.attr({fill: 'white', "font-size":11});
    if (this.info.type == 'client') {
      title.attr({'font-size':10});
    }
    visual.push(title);
  }
  
  var bb = (!is_small ? title.getBBox() : {x:0,y:0,width:20,height:20});
  var w = bb.width + 16;
  var h = bb.height + 12;
  var box;
  var borderradius = (this.info.type == 'client' ? h/2 : 5);
  if (is_small)
    box = paper.circle(this.position.x, this.position.y, 10);
  else
    box = paper.rect(this.position.x - (w / 2), this.position.y - (h / 2), w, h, borderradius);
  
  var colors = {
    node:      {normal:"#ff7400", hover:"#ff9640"},
    supernode: {normal:"#f00", hover:"#ff4040"},
    client:    {normal:"#cd0074", hover:"#e6399b"}
  };

  box.attr({
    fill: $(colors).attr(this.info.type).normal,
    stroke: "white",
    opacity: 1,
    "stroke-width": 3
  });
  box.n = this;
  visual.push(box);
  
  // on mouse drauf Farbe aendern
  box.mouseover(function() {
    this.attr({fill: $(colors).attr(this.n.info.type).hover});
  });
  box.mouseout(function() {
    this.attr({fill: $(colors).attr(this.n.info.type).normal});
  });

  if (!is_small) {
    title.n = this;
    title.b = box;
    title.mouseover(function() {
      this.b.attr({fill: $(colors).attr(this.b.n.info.type).hover});
    });
    title.mouseout(function() {
      this.b.attr({fill: $(colors).attr(this.b.n.info.type).normal});
    });
  
    title.toFront(); 
  }
  
  // rotate if client
  if (this.info.type == 'client') {
    // move visual so that it does not overlap local-node
    // vector from local-node to this client-node
    var dir  = this.position.diff(this.info.nodepos);
    var diff = dir.scale(visual.getBBox().width / 2 - 6);
    visual.translate(diff.x, diff.y);

    visual.rotate(this.info.angle, false);
  }
  
  return visual;
}

/* ------------------------------------------------- */
/* Graph Edge class */

var Edge = function(fromNode, toNode) {
  this.fromNode = fromNode;
  this.toNode = toNode;
};

Edge.prototype.render = function(paper) {
  var line = paper.path(
     "M" + this.fromNode.position.x + "," + this.fromNode.position.y + 
    " L" + this.toNode.position.x   + "," + this.toNode.position.y);
  line.attr("fill", "blue");
  line.attr("stroke", "#666");
  if (this.fromNode.info.type != 'client' && this.toNode.info.type != 'client')
    line.attr("stroke-width", 2);
  return line;  
}

/* ------------------------------------------------- */
/* Graph class */

var Graph = function(target_id, maxIterations, small) {
  this.nodes = new Array();
  this.edges = new Array();

  this.small = small; // true for a more compact design

  this.iters         = 0;
  this.maxIterations = maxIterations;
  
  this.w = $($('#'+target_id)[0]).width();
  this.h = $($('#'+target_id)[0]).height();
  this.paper = Raphael(target_id, this.w, this.h);

  this.temperature = this.w * 100.0;
  this.area = this.w * this.h;
  this.optimalSpringLength = Math.sqrt(this.area / this.nodes.length) * 5;
  
  this.highestNodeNumber = 0;
};

Graph.prototype.nodeExists = function(info) {
  for (var i = 0; i < this.nodes.length; i++) {
    //console.log([this.nodes[i].info.name, info.name]);
    if (this.nodes[i].info.id == info.id)
      return true;
  }
  return false;
};

Graph.prototype.nodeNumberIsUsed = function(number) {
  for (var i = 0; i < this.nodes.length; i++) {
    if (this.nodes[i].number == number)
      return true;
  }
  return false;
};

Graph.prototype.getUniqueNodeNumber = function(online_users) {
  this.highestNodeNumber++;
  return this.highestNodeNumber;
};

Graph.prototype.deleteEdgesAtNode = function(node) {
  var edges = new Array();
  for (var e = 0; e < this.edges.length; e++) {
    var from = this.edges[e].fromNode;
    var to   = this.edges[e].toNode;
    if (from.number != node.number && to.number != node.number)
      edges.push(this.edges[n]);
  }
  this.edges = edges; 
};

Graph.prototype.deleteNode = function(node) {
  var nodes = new Array();
  for (var n = 0; n < this.nodes.length; n++) {
    if (this.nodes[n].number != node.number)
      nodes.push(this.nodes[n]);
  }
  this.nodes = nodes;
};

Graph.prototype.deleteClientNodesExcluding = function(online_users) {
  for (var n = 0; n < this.nodes.length; n++) {
    var node = this.nodes[n];
    if (node.info.type == 'client') {
      // try to find node in online_users
      found = false;
      for (var key in online_users) {
        if (key == node.info.id)
          found = true;
      }
      if (!found) {
        this.deleteEdgesAtNode(node);
        this.deleteNode(node);
      }
    }
  }
};

Graph.prototype.calcOptimalSpringLength = function() {
  return (Math.sqrt(this.area / this.nodes.length) * 5.0);
};

Graph.prototype.restart = function() {
  this.temperature = this.w * 100.0;
  this.iters = 0;
};

Graph.prototype.addNode = function(node) {
  // check if node has not been added before
  for (var i = 0; i < this.nodes.length; i++) {
    if (this.nodes[i].number == node.number)
      return false;
  }
  this.nodes.push(node);
  
  if (node.number > this.highestNodeNumber)
    this.highestNodeNumber = node.number;
    
  this.optimalSpringLength = this.calcOptimalSpringLength();
  return true;
};

Graph.prototype.addEdge = function(edge, dublicateOk) {
  if (dublicateOk || (!dublicateOk && !this.edgeExists(edge.fromNode, edge.toNode)))
    this.edges.push(edge);
};

Graph.prototype.edgeExists = function(fromNode, toNode) {
  if (fromNode.number == toNode.number)
    return true;
  for (var i = 0; i < this.edges.length; i++) {
    var from = this.edges[i].fromNode;
    var to   = this.edges[i].toNode;
    if ((from.number == fromNode.number && to.number == toNode.number) ||
        (from.number == toNode.number   && to.number == fromNode.number))
          return true;
  }
  return false;
};

Graph.prototype.cool = function() {
  this.temperature = this.temperature - 0.8; /* linear */
}

Graph.prototype.min = function(v) {
  return v.len() * this.temperature / 100000.0;
}

Graph.prototype.force_attract = function(x) {
  return (x * x) / this.optimalSpringLength;
}

Graph.prototype.force_repulse = function(x) {
  return (this.optimalSpringLength * this.optimalSpringLength) / x;
}

function rad_to_deg(x) {
  return (180.0 / 3.1415 * x);
}
function deg_to_rad(x) {
  return (3.1415 * x / 180.0);
}

Graph.prototype.log = function() {
  var nodes = [];
  var edges = [];
  for (var i = 0; i < this.nodes.length; i++) {
    var node = this.nodes[i];
    nodes.push([
      Math.round(node.position.x)+"/"+Math.round(node.position.y)
    ]);
  }
  for (var i = 0; i < this.edges.length; i++) {
    var edge = this.edges[i];
    var e = edge.toNode.position.diff(edge.fromNode.position);
    edges.push(
      Math.round(e.len())
    );
  }
  console.log(nodes);
  console.log(edges);
}

Graph.prototype.layout = function() {
  
  // determine amount of nodes (not clients!)
  var normal_nodes = new Array();
  for (var n = 0; n < this.nodes.length; n++) {
    var node = this.nodes[n];
    if (node.info.type != 'client')
      normal_nodes.push(node);
  }

  // special case: one node
  if (normal_nodes.length == 1) {
    var node = normal_nodes[0];
    node.position.x = this.w / 2;
    node.position.y = this.h / 2;
    this.layout_clients();
    return true;
  }

  var delta_t = 1000.0 / 50.0; // starts 50 times within 1000 ms
  
  if (this.temperature > 0.0)
  {
    this.paper.clear();
    
    // calculate repulsive forces
    for (var n = 0; n < this.nodes.length; n++) {
      var node = this.nodes[n];
      node.disp = new Vertex(0, 0);
      node.adjusted = false;
      for (var m = 0; m < this.nodes.length; m++) {
        var otherNode = this.nodes[m];
        if (node.number != otherNode.number) {

          var delta = node.position.diff( otherNode.position );
          if (Math.floor(delta.len()) == 0) delta = new Vertex(1,1);
          var d = delta.len();
    
          node.disp = 
            node.disp.sum(
              delta.quot(d).prod( 
                this.force_repulse(d * node.mass)
              )
            );
        }
      }
    }
    
    // calculate attractive forces
    for (var e = 0; e < this.edges.length; e++) {
      var edge = this.edges[e];
      var u = edge.fromNode;
      var v = edge.toNode;

      var delta = v.position.diff(u.position);
      if (Math.floor(delta.len()) == 0) delta = new Vertex(1,1);
      var d = delta.len();
    
      v.disp =
        v.disp.diff(
          delta.quot(d).prod(
            this.force_attract(d)
          )
        );

      u.disp = 
        u.disp.sum(
          delta.quot(d).prod(
            this.force_attract(d)
          )
        );  
    }

    for (var n = 0; n < this.nodes.length; n++) {
      var node = this.nodes[n];
      if (node.info.type != 'client') {
        node.position = 
          node.position.sum(
            node.disp.quot(node.disp.len()).prod(
              this.min(node.disp)
            )
          );
        
        // don't let them escape the canvas
        if (node.position.x < 0)      node.position.x = 0;
        if (node.position.x > this.w) node.position.x = this.w;
        if (node.position.y < 0)      node.position.y = 0;
        if (node.position.y > this.h) node.position.y = this.h;
      }
    }
    
    this.layout_clients();
    this.cool();
  }

  return true; 
};

Graph.prototype.layout_clients = function() {
  // layout client nodes circular around each node
  for (var n = 0; n < this.nodes.length; n++) {
    var node = this.nodes[n];
    if (node.info.type != 'client') {
      // find client node connected to this one
      var clients = new Array();
      for (var e = 0; e < this.edges.length; e++) {
        var edge = this.edges[e];
        var u = edge.fromNode;
        var v = edge.toNode;
        if ((u.number == node.number && v.info.type == 'client') ||
            (v.number == node.number && u.info.type == 'client')) {
          
          if (u.number == node.number)
            clients.push(v);
          else
            clients.push(u);
        }
      }
      
      // position clients circular around node
      if (clients.length > 0) {
        var radius = (this.small ? 5.0 : 10.0) + (clients.length * 5.0);
        var angle  = 360.0 / clients.length;
        //console.log(angle);
        for (var c = 0; c < clients.length; c++) {
          var client = clients[c];
          client.info.angle = (c > Math.floor(clients.length / 2) ? 270 : 90) - angle * c;
          client.position.x = node.position.x + Math.sin(deg_to_rad(angle * c)) * radius;
          client.position.y = node.position.y + Math.cos(deg_to_rad(angle * c)) * radius;
          client.info.nodepos = node.position;
        }
      }
    }
  }  
};

Graph.prototype.render = function() {
  if (this.iters > this.maxIterations)
    return false;
  this.iters++;
  
  if (this.layout()) {
    this.paper.clear();
    var group = this.paper.set();
    // draw edges
    for (var i = 0; i < this.edges.length; i++) {
      group.push(this.edges[i].render(this.paper));
    }
    // draw nodes
    for (var i = 0; i < this.nodes.length; i++) {
      group.push(this.nodes[i].render(this.paper, this.small));
    }
    // center graph to canvas
    var bbox = group.getBBox();  
    group.translate(-bbox.x, -bbox.y);
    group.translate(
      (this.w - bbox.width) / 2.0,
      (this.h - bbox.height) / 2.0);
  }
};

