const Gio = imports.gi.Gio;
const St = imports.gi.St;

const Desklet = imports.ui.desklet;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Cairo = imports.cairo;
const Clutter = imports.gi.Clutter;
const Util = imports.misc.util;
const UPowerGlib = imports.gi.UPowerGlib;
const Settings = imports.ui.settings;

const LINE_WIDTH = 2;
const MARGIN = 5;

function MyDesklet(metadata, desklet_id){
    this._init(metadata, desklet_id);
}

MyDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
        this.metadata = metadata;
        try {

            this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], this.instance_id);
            this.settings.bindProperty(Settings.BindingDirection.IN, "color", "fg_color", this.on_setting_changed, null);
            this.settings.bindProperty(Settings.BindingDirection.IN, "length", "bs", this.on_setting_changed, null);
            this.settings.bindProperty(Settings.BindingDirection.IN, "day", "isDay", this.on_setting_changed, null);

        }catch(e){
            global.logError(e);
        }

        this._binaryClock = new St.DrawingArea();

//        this.bs = this.settings.getValue("length");
        
        this._binaryClock.width=this.bs;
        this._binaryClock.height=20+10;
        
        this._binaryClock.connect('repaint', Lang.bind(this, this._onBinaryClockRepaint));

        this.setContent(this._binaryClock);
        this.setHeader(_("Clock"));
        this._upClient = new UPowerGlib.Client();
        try {
            this._upClient.connect('notify-resume', Lang.bind(this, this._updateClock));
        } catch (e) {
            this._upClient.connect('notify::resume', Lang.bind(this, this._updateClock));
        }

        this.on_setting_changed();
    },

    on_setting_changed: function() {
        this._binaryClock.width=this.bs;		
        this._updateClock();
    },

    _updateClock: function() {
        let displayDate = new Date();
        if(!this.isDay){
            this.title = "Year";
            this._displayTime = (displayDate.getDate()+displayDate.getMonth()*30)/365;
        }else{
            this.title = "Day";
            this._displayTime = displayDate.getHours() / 24;
        }
            
        this._binaryClock.queue_repaint();

        Mainloop.timeout_add_seconds(1, Lang.bind(this, this._updateClock));
        return false;
    },

    _onBinaryClockRepaint: function(area) {
        let cr = area.get_context();

        cr.setOperator(Cairo.Operator.CLEAR);
        cr.setLineWidth(LINE_WIDTH);
        cr.rectangle(0, 0, 0, 0);
        cr.fill();

        cr.setOperator(Cairo.Operator.OVER);
        cr.setLineWidth(LINE_WIDTH);
        let step = this.bs + LINE_WIDTH + 2; 
        cr.translate(MARGIN + (step - 2)/2, MARGIN + (step - 2)/2);
        Clutter.cairo_set_source_color(cr, this._binaryClock.get_theme_node().get_foreground_color());

        cr.rectangle((0-this.bs/2),(10-this.bs/2),this._binaryClock.width*this._displayTime+5, LINE_WIDTH*5);
        cr.fill();

        cr.rectangle((0-this.bs/2),(10-this.bs/2),this._binaryClock.width-10, LINE_WIDTH*5);
        cr.stroke();


        cr.translate(step, 0);
        cr.translate(-6 * step, step);

        // main container for the desklet
        this.text = new St.Entry();
        
        this.text.set_text(this.title + " Progress " + ~~(this._displayTime*100 + 2/3) + "%");



        let children = this._binaryClock.get_children();
        for (let i = 0; i < children.length; i++) {
            this._binaryClock.remove_actor(children[i]);
        }
        this._binaryClock.add_actor(this.text);

        this.setContent(this.window);
    }
}

function main(metadata, desklet_id) {
    let desklet = new MyDesklet(metadata, desklet_id);
    return desklet;
}
