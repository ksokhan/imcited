
search = {
    resultsTemplate: new EJS({url: 'search_results.ejs'}),
    searchItems: $("#search_results"),

    render: function(data) {
        var e = this.resultsTemplate.render({'results': data })
        $(this.searchItems).append(e);
    },

    /*
     * the primary AJAX function to load data
     */

    init: function(searchterm) {
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

/*
 * Event Handlers
 *
 */

$('#searchForm').submit(function(e) {
    e.preventDefault();
    search.init($('#searchBox').val());
})
