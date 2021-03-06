var moment = require('moment');

var AssetsManager = require('starbound-assets').AssetsManager;
var WorldManager = require('starbound-world').WorldManager;
var WorldRenderer = require('starbound-world').WorldRenderer;

// Create an assets manager which will deal with package files etc.
var assets = new AssetsManager({workerPath: 'build/worker-assets.js'});

// Create a world manager that handles loading the world and its regions.
var world = new WorldManager({workerPath: 'build/worker-world.js'});

// Set up a renderer that will render the graphics onto screen.
var renderer = new WorldRenderer(document.getElementById('viewport'), world, assets);

function loadAssets(file) {
  assets.addFile('/', file, function (err) {
    renderer.preload();
  });
}

function loadWorld(file) {
  world.open(file, function (err, metadata) {
    renderer.render();
  });
}

var worldsAdded, groups = {};
function addWorld(file) {
  var list = document.starbounded.worldList;

  if (!worldsAdded) {
    // Remove the "Select directory" message.
    list.remove(0);
    list.removeAttribute('disabled');
    document.starbounded.loadWorld.removeAttribute('disabled');
    worldsAdded = {};
  }

  var pieces = file.name.replace('.world', '').split('_');
  var sector = pieces[0];

  var group = groups[sector];
  if (!group) {
    group = document.createElement('optgroup');
    group.setAttribute('label', sector);
    groups[sector] = group;
    list.appendChild(group);
  }

  // Add the world in the right place according to time modified.
  for (var i = 0; i < group.childNodes.length; i++) {
    var other = worldsAdded[group.childNodes[i].value];
    if (other.lastModifiedDate < file.lastModifiedDate) break;
  }

  worldsAdded[file.name] = file;

  var label = 'planet ' + pieces[4];
  if (pieces[5]) label += ' moon ' + pieces[5];
  label += ' @ (' + pieces[1] + ', ' + pieces[2] + ')';
  label += ', played ' + moment(file.lastModifiedDate).fromNow();

  var option = new Option(label, file.name);
  option.setAttribute('disabled', '');
  group.insertBefore(option, group.childNodes[i]);

  // Verify that the world file is valid.
  var reader = new FileReader();
  reader.onloadend = function () {
    if (reader.result == 'SBBF02') {
      option.removeAttribute('disabled');
    } else {
      option.label = '[pre-angry] ' + option.label;
    }
  };
  reader.readAsText(file.slice(0, 6));
}

if (document.starbounded.root.webkitdirectory) {
  // The browser supports selecting the directory.
  document.body.classList.add('directory-support');

  document.starbounded.root.onchange = function () {
    for (var i = 0; i < this.files.length; i++) {
      var file = this.files[i];
      if (file.name == 'packed.pak') {
        loadAssets(file);
      } else if (file.name.match(/\.world$/)) {
        addWorld(file);
      }
    }
  };

  document.starbounded.loadWorld.onclick = function () {
    var file = worldsAdded && worldsAdded[document.starbounded.worldList.value];
    if (!file) return;
    loadWorld(file);

    document.starbounded.loadWorld.setAttribute('disabled', '');
    document.starbounded.worldList.setAttribute('disabled', '');
  };
} else {
  // Separate files solution.
  document.starbounded.assets.onchange = function () {
    loadAssets(this.files[0]);
  };

  document.starbounded.world.onchange = function () {
    loadWorld(this.files[0]);
  };
}

document.onkeydown = function (event) {
  switch (event.keyCode) {
    case 37:
      renderer.scroll(-1, 0);
      break;
    case 38:
      renderer.scroll(0, 1);
      break;
    case 39:
      renderer.scroll(1, 0);
      break;
    case 40:
      renderer.scroll(0, -1);
      break;
    default:
      return;
  }

  event.preventDefault();
};
