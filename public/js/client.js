
search = {
    resultsTemplate: new EJS({url: '/templates/search_results.ejs'}),
    searchItems: $("#search_results"),

    render: function(data) {
        var e = this.resultsTemplate.render({'results': data })
        $(this.searchItems).append(e);
    },

    /*
     * the primary AJAX function to load data
     */

    init: function(searchterm) {
        if (this.searchItems.length == 0) return false;
        this.reset();
        $.ajax({
              url: 'https://www.googleapis.com/customsearch/v1',
              data: {
                    key 	: 'AIzaSyC1ZJwQNRaDXH1u9Cek2qkkW73RvqA9Vw8',
                    cx		: '001971603169725994744:mgvhepgw6oc',
                    q 		: searchterm
              },
              dataType: 'jsonp',
              success: function(data) { console.log(data);search.render(data.items) }
            });
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

quotebox = {
  el: $('#quoteboxText'),
  btn_update: $('#quoteUpdate'),
  status_editing: false, // updates to true

  init: function() {
    this.el.html(localStorage.getItem('quote-text'));
    this.btn_update.hide();
    search.init(localStorage.getItem('quote-text'));

    // attach events:
    this.btn_update.bind('click', function(e) {e.preventDefault(); quotebox.update() });
    this.el.bind('click', this.toggle_edit());
    this.el.bind('blur keyup paste', this.update());
  },

  update: function() {
    var txt = this.el.text();
    localStorage.setItem('quote-text', txt);
    //this.toggle_edit();
    this.el.trigger('blur');
    search.init(txt);
  },

  toggle_edit: function() {
      quotebox.btn_update.fadeToggle();
      quotebox.el.toggleClass('active');
      quotebox.status_editing = true;
  }
}

quotebox.init();

/*
 * Event Handlers
 *
 */


