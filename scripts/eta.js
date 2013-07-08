var H5P = H5P || {};

/**
 * Constructor.
 * 
 * @param {object} params Options for this library.
 * @param {string} contentPath The path to our content folder.
 */
H5P.ExportableTextArea = function (params, contentPath) {
  var self = this;
  
  console.log(params);
  
  self.index = (params.index !== undefined ? params.index+1 : '');
  self.header = '<span class="index">' + self.index + '</span>. <span class="label">' + (params.label ? params.label : '') +'</span>';
  
  var attach = function ($wrapper) {
    var classes = 'h5p-eta-input' + (H5P.ExportableTextArea.Exporter.supportsExport() ? '' : ' not-supported');
    var text = H5P.ExportableTextArea.Exporter.supportsExport() ? '' : 'Not supported on your device';
    self.$content = H5P.jQuery('<div class="h5p-eta-label">'+self.header+'</div><textarea class="'+classes+'" data-index="'+self.index+'">'+text+'</textarea>');
    $wrapper.addClass('h5p-eta').html(self.$content);
  };
  
  var onDelete = function(params, slideIndex, elementIndex) {
    H5P.ExportableTextArea.CPInterface.onDelete(params, slideIndex, elementIndex, self);
  };
  
  var onAdd = function(params, slideIndex) {
    H5P.ExportableTextArea.CPInterface.onAdd(params, slideIndex, self);
  };
  
  return {
    attach: attach,
    machineName: 'H5P.ExportableTextArea',
    exportAnswers: true,
    onDelete: onDelete,
    onAdd: onAdd
  };
};

/**
 * Interface responsible for handling index calculations beeing done when 
 * adding and removing Answer elements 
 */
H5P.ExportableTextArea.CPInterface = (function() {
 
  /* Containing number of Answer elements per slide */
  var answerCounter = [];
  
  return {
    onDelete: function(params, slideIndex, elementIndex, elementInstance) {
      // Reorder index on current slide
      var filtered = params[slideIndex].elements.filter(function(element, index){
        return /*index>=elementIndex &&*/ H5P.libraryFromString(element.action.library).machineName === 'H5P.ExportableTextArea';
      }).sort(function(a,b){
        return b.action.params.index - a.action.params.index;
      });
      
      answerCounter[slideIndex] = [];
      for (var i = 0; i<filtered.length; i++) {
        filtered[i].action.params.index = i;
        answerCounter[slideIndex][i] = true;
        H5P.jQuery('.h5p-slides-wrapper > .h5p-current').children('.h5p-eta').eq(i).find('.index').html(i+1);
      } 
    },
    onAdd: function(params, slideIndex, elementInstance) {
      if(answerCounter[slideIndex] === undefined) {
        answerCounter[slideIndex] = [];
      }
      if(params.action.params.index === undefined) {
        params.action.params.index = answerCounter[slideIndex].length;
      }
      
      console.log(answerCounter[slideIndex].length);
      
      answerCounter[slideIndex][params.action.params.index] = true;
    }
  };
})();

/**
 * Export all Answers
 */
H5P.ExportableTextArea.Exporter = (function() {
  
  var deviceIsIPx = undefined;
  var useFlash = undefined;
  
  return {
    export: function() {
      // Save it as a file:
      if (this.useFileSaver()){
        var blob = new Blob([this.createDocContent()], {type: "application/msword;charset=utf-8"});
        saveAs(blob, 'exported-text.doc');
      }
    },
    
    createDocContent: function() {
      // Create HTML:
      var html = '<html><body>';
      H5P.jQuery('.h5p-slide').each(function(index){
        // Sort on index per slide, then create html
        H5P.jQuery('.h5p-eta-input', this).sort(function(a,b){
          return H5P.jQuery(a).data('index') > H5P.jQuery(b).data('index') ? 1 : -1;
        }).each(function(){
          html += '<h2>' + H5P.jQuery(this).prev().find('.label').text() + '</h2>';
          html += '<p>' + H5P.jQuery(this).val() + '</p>';
        });
      });
      html += '</body></html>';
      
      return html;
    },
    
    createExportButton: function(title) {
      var self = this;
      
      if(this.useFileSaver()) {
        return '<a href="javascript:void(0)" class="h5p-eta-export" style="display: none;">' + title + '</a>';
      }
      else {
        var $downloadify = $('<div></div>');
        
        $downloadify.downloadify({
          filename: function(){
            return 'answer-text.doc';
          },
          data: function(){ 
            return self.createDocContent();
          },        
          onError: function(){ 
            alert('You must put something in the File Contents or there will be nothing to save!'); 
          },          
          swf: H5P.getLibraryPath('H5P.ExportableTextArea-1.0') + '/resources/downloadify.swf',
          width: 100,
          height: 30,
          transparent: true,
          append: false,
          label: title
        });
        
        return '<a href="javascript:void(0)" class="h5p-eta-export" style="display: none;">'+$downloadify.html()+'</a>';
      }
    },
    
    useFileSaver: function() {
      if(useFlash === undefined) {
        useFlash = $.browser.msie && $.browser.version<10;
      }
      return !useFlash;
    },
    
    /**
     *  Check if this device/browser supports download 
     * at all 
     */
    supportsExport: function() {
      if(deviceIsIPx === undefined) {
        deviceIsIPx = navigator.userAgent.match(/iPad/i) === null && 
              navigator.userAgent.match(/iPhone/i) === null &&
              navigator.userAgent.match(/iPod/i) === null;
      }
      return deviceIsIPx;
    }
  };
})();

