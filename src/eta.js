import { Document, ExternalHyperlink, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

const ExportableTextArea = (function ($) {
  /**
   * Constructor.
   *
   * @param {object} params Options for this library.
   * @param {int} id Content identifier
   */
  function C(params, id, contentData) {
    this.index = (params.index !== undefined ? params.index : -1);
    this.header = (params.label !== undefined ? params.label : '');
    this.notSupportedText = params.exportNotSupported;
    this.defaultAnswer = (contentData && contentData.previousState ? contentData.previousState.answer : '');
    this.contentData = contentData;

    var supportsExport = H5P.ExportableTextArea.Exporter.supportsExport();
    var labelId = (contentData.subContentId ? contentData.subContentId : id) + '-label';
    this.$label = $('<div id="' + labelId + '" class="h5p-eta-label">' + this.header + '</div>');
    this.$input = $('<textarea class="h5p-eta-input" aria-labelledby="' + labelId + '" ' + (supportsExport ? '' : 'placeholder="' + this.notSupportedText + '"') + 'data-index="' + this.index + '">' + this.defaultAnswer + '</textarea>');
  }

  C.prototype.attach = function ($wrapper) {
    this.$content = $wrapper.addClass('h5p-eta')
      .append(this.$label)
      .append(this.$input);
  };

  C.prototype.onDelete = function (params, slideIndex, elementIndex) {
    H5P.ExportableTextArea.CPInterface.onDelete(params, slideIndex, elementIndex, this);
  };

  C.prototype.onAdd = function (params, slideIndex) {
    H5P.ExportableTextArea.CPInterface.onAdd(params, slideIndex, this);
  };

  C.prototype.exportAnswers = true;

  C.prototype.getTitle = function () {
    return H5P.createTitle((this.contentData && this.contentData.metadata && this.contentData.metadata.title) ? this.contentData.metadata.title : '');
  };

  C.prototype.getCurrentState = function () {
    var text = this.$input.val();
    if (text.trim()) {
      return {
        answer: text
      };
    }
  };

  C.prototype.resetTask = function () {
    this.$input.val('');
  };

  return C;
})(H5P.jQuery);

/**
 * Interface responsible for handling index calculations beeing done when
 * adding and removing Answer elements
 *
 * Implemented as singleton
 */
ExportableTextArea.CPInterface = (function _eta_cp_interface_internal() {
  if (ExportableTextArea._singleton) {
    return ExportableTextArea._singleton;
  }
  const self = ExportableTextArea._singleton = {};

  self.answerCounter = [];

  self.onDelete = function (params, slideIndex, elementIndex, elementInstance) {
    // Reorder index on current slide
    var filtered = params.slides[slideIndex].elements.filter(function (element, index) {
      return element.action && H5P.libraryFromString(element.action.library).machineName === 'H5P.ExportableTextArea';
    }).sort(function (a, b) {
      return a.action.params.index - b.action.params.index;
    });

    self.answerCounter[slideIndex] = [];
    var $currentSlide = H5P.jQuery('.h5p-slides-wrapper > .h5p-current');
    for (var i = 0; i < filtered.length; i++) {
      filtered[i].action.params.index = i;
      self.answerCounter[slideIndex][i] = true;
      var $child = $currentSlide.children('.h5p-eta').has('[data-index=' + i + ']');
      if (!$child.length) {
        $child = $currentSlide.children('.h5p-eta').has('[data-index=' + (i + 1) + ']');
        $child.find('.index').html(i + 1);
        $child.find('.h5p-eta-input').attr('data-index', i);

      }
    }
  };

  self.onDeleteSlide = function (slideIndex) {
    self.answerCounter[slideIndex] = [];
  };

  self.changeSlideIndex = function (left, right) {
    var tmp = self.answerCounter[left];
    self.answerCounter[left] = self.answerCounter[right];
    self.answerCounter[right] = tmp;
  };

  self.onAdd = function (params, slideIndex, elementInstance) {
    if (self.answerCounter[slideIndex] === undefined) {
      self.answerCounter[slideIndex] = [];
    }

    if (params.action.params.index === undefined) {
      params.action.params.index = self.answerCounter[slideIndex].length;
    }

    self.answerCounter[slideIndex][params.action.params.index] = true;
  };

  return self;
})();

/**
 * Export utilities
 */
ExportableTextArea.Exporter = {

  run: function (slides, elements) {
    Packer.toBlob(this.createDocx(slides, elements)).then((blob) => {
      saveAs(blob, "exported-text.docx");
    });
  },

  supportsExport: function () {
    return !!new Blob; // Feature detection, ref: https://www.npmjs.com/package/file-saver
  },

  createDocx: function (slides, elements) {
    const exportableTextAreas = [];

    // Go through all slides and locate instances of H5P.ExportableTextArea
    for (var i = 0; i < elements.length; i++) {

      // Empty slide
      if (!elements[i]) {
        continue;
      }

      for (var j = 0; j < elements[i].length; j++) {
        var element = elements[i][j];

        if (element.libraryInfo && element.libraryInfo.machineName === 'H5P.ExportableTextArea') {
          var params = slides[i].elements[j];
          var input = (element.$input !== undefined ? element.$input.val() : '');

          let etaContents = {
            header: element.header.replace(/<[^>]+>/g, ''),
            text: input
          };

          if (params.action.params.exportComments !== undefined && params.action.params.exportComments) {
            etaContents.comments = params.solution.replace(/<[^>]+>/g, '');
          }

          exportableTextAreas.push(etaContents);
        }
      }
    }

    const paragraphs = exportableTextAreas.map(eta => {
      return new Paragraph({
        children: [
          new TextRun({ text: eta.header, break: 2 }),
          new TextRun({ text: eta.text, break: 1 }),
          new TextRun({ text: eta.comments, break: 1 }),
        ]
      });
    });

    // Include the URL to the content as a hyperlink at the top of the document
    paragraphs.unshift(new Paragraph({
      children: [
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: document.URL,
              style: "Hyperlink",
            }),
          ],
          link: document.URL,
        }),
      ],
    }));

    return new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });
  },

  createExportButton: function (title) {
    if (!H5P.ExportableTextArea.Exporter.supportsExport()) {
      return '';
    }

    return '<a href="#" class="h5p-eta-export">' + title + '</a>';
  },
};

export default ExportableTextArea;
