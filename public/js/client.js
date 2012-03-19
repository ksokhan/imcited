
var citation = {
  template: new EJS({url: '/templates/citations.ejs'}),
  data: {
    citations: []
  },

  init: function() {
    var e = localStorage.getItem('data') || '{ "citations": [] }';
    this.data = JSON.parse(e);
  },

  render: function(el) {
    var e = this.template.render({'results': this.data.citations });
    $(el).append(e);
  },

  update: function() {
    localStorage.setItem('data', JSON.stringify(this.data));
  },

  clear: function() {
    localStorage.removeItem('data');
  },

  check: function(url) {
    var q = true;
    $.each(this.data.citations, function(index, val) {
      if (this.url == url) { q = false; return false; }
    });
    return q;
  },

  add: function (e) {
    if (! citation.check(e.url) ) {
      alert('This citation has already been added!');
    } else {
      citation.data.citations.push(e);
      citation.update();
    }
  },

  remove: function(e) {
    citation.data.citations.splice(e,1);
    citation.update();
  }
}



var search = {
    resultsTemplate: new EJS({url: '/templates/search_results.ejs'}),
    searchItems: $("#search_results"),

    render: function(data) {
      var e = this.resultsTemplate.render({'results': data });
      this.searchItems.append(e);
    },

    /*
     * the primary AJAX function to load data
     */

    init: function(searchterm) {
        if (this.searchItems.length == 0) return false;
        this.reset();

        /*$.ajax({
          url: 'https://www.googleapis.com/customsearch/v1',
          data: {
                key	: 'AIzaSyC1ZJwQNRaDXH1u9Cek2qkkW73RvqA9Vw8',
                cx 		: '001971603169725994744:mgvhepgw6oc',
                q  		: searchterm
          },
          dataType: 'jsonp',
          success: function(data) { search.render(data.items) }
        });*/

        // test data:
        $.getJSON('/js/sampleResponse.json', function(data) { search.render(data.items); });
    },

    /*
     * This clears old data and sets up loading screen.
     */

    reset: function() {
        this.searchItems.empty();
        //this.spinner
        //add a spinner here?
    }
}

var quotebox = {
  el: $('#quoteboxText'),
  btn_update: $('#quoteUpdate'),
  holder: $('.quoteBox'),

  init: function() {
    var txt = localStorage.getItem('quote-text') || "Enter the phrase you want to cite...";
    this.el.val(txt);

    // attach events:
    this.btn_update.bind('click', function(e) {
      e.preventDefault();
      if (! $(this).hasClass('updating') ) { quotebox.el.trigger('focus'); }
      else { $(this).removeClass('updating') }
    });
    this.el.bind('focus', function() { quotebox.toggle_edit(true) });
    this.el.bind('blur', function() { quotebox.update() });

  },

  update: function() {
    var txt = this.el.val();
    localStorage.setItem('quote-text', txt);
    quotebox.toggle_edit(false);
    search.init(txt);
  },

  toggle_edit: function(e) {
      if (e === true) { quotebox.holder.addClass('active'); this.btn_update.val('Update').addClass('updating') }
      else { quotebox.holder.removeClass('active'); this.btn_update.val('Edit') }
  }
}


// init system functions

citation.init();

/*
 * Event Handlers
 *
 */

switch($('body').attr('id')) {
  case  'home':

    quotebox.init();

  break;
  case 'add':

  $('#addSource').submit(function(e) {
    e.preventDefault();

    // parse the pretty link without any subdirectories or http
    var lnk = $('#citationUrl').val().split('/');
    lnk = (lnk[0] == "http:") ? lnk[2] : lnk[0];

    var txt = $('#citationText').val().substring(0,240);
    txt += " ..."

    citation.add({
      url: $('#citationUrl').val(),
      text: txt,
      title: $('#citationTitle').val(),
      displayLink: lnk
    });

    this.reset();
    $(this).find('input[type=submit]').val('Citation Added').addClass('btn-success');

  });

  break;
  case 'review':

    citation.render('#citations');
    $('#citations').delegate('.removeCitation', 'click', function(e) {
      e.preventDefault();
      $(this).parents('li').slideUp(300, function() { $(this).remove() });
      // update citation count
      $('#citations .citationNum').html( $('#citations .citationNum').html() - 1 );
      // remove item from data array
      citation.remove($(this).attr('rel'));
    });

    // publish citation
    $('#publishCitation').click(function() {
      $(this).html('Saving...');
      $.ajax({
        url: '/cite/publish',
        type: 'POST',
        data: {
              citations : citation.data.citations,
              statement: localStorage.getItem('quote-text')
        },
        dataType: 'json',
        success: function(data) { window.location = "/c/" + data.url; }
      });
    });

  break;
  case 'suggested':
    search.init(localStorage.getItem('quote-text'));

    $('#search_results').delegate('.addCitation', 'click', function(e) {
      e.preventDefault();
      $(this).addClass('btn-success').html('Item Added');
    });

  break;
}

$('.btn.preventDefault').live('click', function(e) {
  e.preventDefault();
});




