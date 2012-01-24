if(!ORYX.Plugins) {
	ORYX.Plugins = new Object();
}
// Object which stores last edited object with our icon.
var lastEditedObjecyt;
var win;
var faccade;

/**
 * Decode HTML entities, e.g. &lt;b&gt; changes into <b>
 */
function htmlDecode(input) {
	var e = document.createElement('div');
	e.innerHTML = input;
	return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

/**
 * Parses all editor properties
 */
function editorParseProperties(obj) {
	if (typeof obj.children != "undefined") {
		for (var i = 0; i < obj.children.length; i++) {
			editorParseProperties(obj.children[i]);
		}
	}
	if (typeof obj.properties != "properties") {
		for (p in obj.properties) {
			obj.properties[p] = htmlDecode(obj.properties[p]);
		}
	}
}

/**
 * Sets data for component
 */
function editorSetData(retString){
    if (retString == null || retString == "") {
	    return;
	}
	  
    retString = Ext.decode(retString.replace(/&quot;/g,'"'));
    editorParseProperties(retString.params);

	var taskNameOldValue = lastEditedObjecyt.properties['oryx-tasktype'];
	var taskNameNewValue = retString.taskName;
	var oldAC = lastEditedObjecyt.properties['oryx-aperte-conf'];
	var newAC = Ext.encode(retString.params);

    //check UNDO
	if (taskNameOldValue == taskNameNewValue) {
	    if (taskNameOldValue == "User") {
		  if (oldAC == newAC) {
		    win.close();
			return;
		  }
		} else {
			if (oldAC != null && oldAC != "") {
			   var aperteConfOldParams = Ext.decode(oldAC);
			   var aperteConfNewParams = retString.params;
			   
			   var oldParamsSize = 0;
			   var newParamsSize = 0;
			   for (var i in aperteConfOldParams) {
				 oldParamsSize++;
			   }
			   for (var i in aperteConfNewParams) {
				 newParamsSize++;
			   }
			   if (oldParamsSize == newParamsSize) {
				 var makeUndo = false;
				 for (var i in aperteConfOldParams) {
				   if (aperteConfOldParams[i] != aperteConfNewParams[i]) {
					 makeUndo = true;
				   }
				 }
				 if (!makeUndo) {
				   win.close();
				   return;
				 }
			   }
			}
		}
	}
	
	
    
	var commandClass = ORYX.Core.Command.extend({
			construct: function(){
				this.lastEditedObj 	  = lastEditedObjecyt;
				this.oldTaskType         = taskNameOldValue;
				this.newTaskType         = taskNameNewValue;
				this.oldAperteConf		 = oldAC;
				this.newAperteConf		 = newAC;
			},			
			execute: function(){
				this.lastEditedObj.properties['oryx-aperte-conf'] = this.newAperteConf;
				this.lastEditedObj.properties['oryx-tasktype'] = this.newTaskType;
			},
			rollback: function(){
				this.lastEditedObj.properties['oryx-aperte-conf'] = this.oldAperteConf;
				this.lastEditedObj.properties['oryx-tasktype'] = this.oldTaskType;
			}
		});
	
	// Instanciated the class
	var command = new commandClass();
		
	// Execute the command
	faccade.executeCommands([command]);
	
	win.close();
}

ORYX.Plugins.AperteUiShapeMenuPlugin = ORYX.Plugins.ShapeMenuPlugin.extend({
    runAperte: function() {
		var elements = this.currentShapes;
		if(elements.length != 1) return;
		lastEditedObjecyt = elements[0];
		faccade = this.facade;
        var props = lastEditedObjecyt.properties;
		var type =  props['oryx-tasktype'];
		var name = props['oryx-name'];
		var data =  props['oryx-aperte-conf'];
        this.editorOpenNewWindow(name, type, data);
	},
	
    //Opens new popup windows
    editorOpenNewWindow: function (stepName, stepType, stepAperteConfig){
		var iframeName = "ifname";
		var props = lastEditedObjecyt.properties;

		var rurl = window.location.href;
		var base_editor_url = rurl.substr(0,rurl.indexOf('editor'));
		var back_url = base_editor_url+"aperte_post";
		
		win = new Ext.Window({
			width:900,
			height:500,
			autoScroll:false,
			html:'',
			modal:true,
			maximizable:true,
			cls:'x-window-body-report',
			title:'Aperte Step Editor'
		});
		win.on('close', function() {
			if(Ext.isIE) {
				win.body.dom.firstChild.src = "javascript:false";
			}
		}, win);
			
		var id = Ext.id();
		var frame = document.createElement('iframe');
 
		frame.id = id;
		frame.name = id;
		frame.frameBorder = '0';
		frame.width = '100%';
		frame.height = '100%';
		frame.src = '';//Ext.isIE ? Ext.SSL_SECURE_URL : "javascript:;";
 
		win.show();
		win.body.appendChild(frame);
 
		// Seems to be workaround for IE having name readonly.
		if(Ext.isIE) {
			document.frames[id].name = id;
		}
		
		var form = new Ext.FormPanel({
			url: APERTE_STEP_EDITOR_URL,
			renderTo:Ext.getBody(),
			standardSubmit:true,
			method:'POST',
			defaultType:'hidden',
			items:[	new Ext.form.TextField({
                        id:'stepName',
                        name:'stepName',
                        inputType:'text',
                        fieldLabel:'step_config',
                        value: stepName
                    }),
                    new Ext.form.TextField({
                        id:'stepType',
                        name:'stepType',
                        inputType:'text',
                        fieldLabel:'stepType',
                        value: stepType
                    }),
			        new Ext.form.TextField({
			            id:'stepConfig',
						name:'stepConfig',
						inputType:'text',
						fieldLabel:'step_config',
						value: stepAperteConfig
					}),
					new Ext.form.TextField({
					    id:'fre',
						name:'restartApplication',
						inputType:'text',
						fieldLabel:'restartApplication',
						value: "1"
					}),
					new Ext.form.TextField({
					    id:'cbe',
						name:'callbackUrl',
						inputType:'text',
						fieldLabel:'callbackUrl',
						value: back_url
					})
            ]
		});
 
		form.getForm().el.dom.action = form.url;
		form.getForm().el.dom.target = id;
			
		if(!Ext.isGecko) {
			var mask = new Ext.LoadMask(win.id, {msg:"Loading..."});
			mask.show();
		}
 
		Ext.EventManager.on(frame, 'load', function() {
			if(mask !== undefined) { mask.hide(); }
			form.destroy();
		});
 
		Ext.emptyFn.defer(200); // frame on ready?
		form.getForm().submit();
    },

	createMorphMenu: function() {
		
		this.morphMenu = new Ext.menu.Menu({
			id: 'Oryx_morph_menu',
			items: []
		});
		
		this.morphMenu.on("mouseover", function() {
			this.morphMenuHovered = true;
		}, this);
		this.morphMenu.on("mouseout", function() {
			this.morphMenuHovered = false;
		}, this);
		
		
		// Create the button to show the morph menu
		var button = new ORYX.Plugins.ShapeMenuButton({
			hovercallback: 	(ORYX.CONFIG.ENABLE_MORPHMENU_BY_HOVER ? this.showMorphMenu.bind(this) : undefined), 
			resetcallback: 	(ORYX.CONFIG.ENABLE_MORPHMENU_BY_HOVER ? this.hideMorphMenu.bind(this) : undefined), 
			callback:		(ORYX.CONFIG.ENABLE_MORPHMENU_BY_HOVER ? undefined : this.toggleMorphMenu.bind(this)), 
			icon: 			ORYX.PATH + 'images/wrench_orange.png',
			align: 			ORYX.CONFIG.SHAPEMENU_BOTTOM,
			group:			0,
			msg:			ORYX.I18N.ShapeMenuPlugin.morphMsg
		});				
		
		// Create the button to show the morph menu
		var buttonAperte = new ORYX.Plugins.ShapeMenuButton({
		    id:				"AperteIdButton",
			callback:		this.runAperte.bind(this), 
			icon: 			ORYX.PATH + 'images/aperte_small.png',
			align: 			ORYX.CONFIG.SHAPEMENU_BOTTOM,
			group:			0,
			msg:			"Aperte Step Editor"
		});				
		
		
		
		this.shapeMenu.setNumberOfButtonsPerLevel(ORYX.CONFIG.SHAPEMENU_BOTTOM, 2)
		this.shapeMenu.addButton(button);
		this.shapeMenu.addButton(buttonAperte);
		
		this.morphMenu.getEl().appendTo(button.node);		
		this.morphButton = button;
		this.aperteButton = buttonAperte;
		
	},
	showAperteButton: function(elements){
		if(elements.length != 1) return;
		if(elements[0].properties['oryx-tasktype'] != null && elements[0].properties['oryx-tasktype'] != "None"){
			this.aperteButton.prepareToShow();
		}
		
	},
	
	showShapeMenu: function( dontGenerateNew ) {
	
		if( !dontGenerateNew || this.resetElements ){
			
			window.clearTimeout(this.timer);
			this.timer = window.setTimeout(function(){
				
					// Close all Buttons
				this.shapeMenu.closeAllButtons();
		
				// Show the Morph Button
				this.showMorphButton(this.currentShapes);
				// Show the Morph Button
				this.showAperteButton(this.currentShapes);
				
				
				// Show the Stencil Buttons
				this.showStencilButtons(this.currentShapes);	
				
				// Show the ShapeMenu
				this.shapeMenu.show(this.currentShapes);
				
				this.resetElements = false;
			}.bind(this), 300)
			
		} else {
			
			window.clearTimeout(this.timer);
			this.timer = null;
			
			// Show the ShapeMenu
			this.shapeMenu.show(this.currentShapes);
			
		}
	},
});