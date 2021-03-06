// Class for data IO
// Filename: io.js
import config from 'config';
import { mediator } from 'mediator';

var IO = function() {
    this.test = 0;
    this.areas = {};
    this.areas_array = [];
    this.fs = [];
    this.title = "default-title";
};

IO.prototype = {
    // get, transform and serve data to other modules
    async_get_data: function(file, input_format, callback) {
        d3[input_format](file, (csv) => {
            callback(csv);
        });
    },

    get_server_files: function(callback) {
        $.ajax({
          type: 'POST',
          url: config.server_url + "services/staticFiles.php",
          data: "",
          dataType: 'JSON',
          success: (json) => {
            config.files = [];
            for (let i = 0; i < json.length; i++) {
              config.files.push({
                "title": json[i].title,
                "file": config.server_url + "static" + json[i].file
              });
            }
            mediator.publish("register_bubbles");
            d3[config.input_format](mediator.current_bubble.file, callback);
          }
        });
    },

    convertToFirstNameLastName: function (authors_string) {
        var authors = authors_string.split(";");
        
        for(var i = authors.length - 1; i >= 0; i--) {
            if(authors[i] === "") {
               authors.splice(i, 1);
            }
        }
        
        var authors_string = "";
        var authors_short_string = "";
        for (var i = 0; i < authors.length; i++) {            
            var names = authors[i].trim().split(",");
            var last_name = names[0].trim();
            if (names.length > 1) {
                var first_name = names[1].trim();
                authors_string += first_name + " " + last_name;
                authors_short_string += first_name.substr(0, 1) + ". " + last_name;
            } else {
                authors_string += last_name;
                authors_short_string += last_name;
            }

            if (i < (authors.length - 1)) {
                authors_string += ", ";
                authors_short_string += ", ";
            }
        }
        return { string: authors_string, short_string: authors_short_string };
    },

    setToStringIfNullOrUndefined: function (element, strng) {
        if (element === null || typeof element === "undefined") {
            return strng;
        } else {
            return element;
        }
    },

    setDefaultIfNullOrUndefined: function (object, element, defaultVal) {
        if (object[element] === null || typeof object[element] === "undefined") {
            if (config.debug) console.log(`Sanitized a value ${object[element]} of ${element} to ${defaultVal}`);
            object[element] = defaultVal;
        }
    },

    initializeMissingData: function(data) {
        let that = this;
        let locale = config.localization[config.language];
        data.forEach((d) => {
            that.setDefaultIfNullOrUndefined(d, 'area', locale.default_area);
            that.setDefaultIfNullOrUndefined(d, 'authors', locale.default_author);
            that.setDefaultIfNullOrUndefined(d, 'file_hash', locale.default_hash);
            that.setDefaultIfNullOrUndefined(d, 'id', locale.default_id);
            that.setDefaultIfNullOrUndefined(d, 'paper_abstract', locale.default_abstract);
            that.setDefaultIfNullOrUndefined(d, 'published_in', locale.default_published_in);
            that.setDefaultIfNullOrUndefined(d, 'readers', locale.default_readers);
            that.setDefaultIfNullOrUndefined(d, 'title', locale.no_title);
            that.setDefaultIfNullOrUndefined(d, 'url', locale.default_url);
            that.setDefaultIfNullOrUndefined(d, 'x', locale.default_x);
            that.setDefaultIfNullOrUndefined(d, 'y', locale.default_y);
            that.setDefaultIfNullOrUndefined(d, 'year', locale.default_year);
        })
    },

    prepareData: function (highlight_data, fs) {
        this.areas = {};
        this.areas_array = [];
        var _this = this;
        var xy_array = [];
        // convert to numbers
        var cur_data = fs;
        cur_data.forEach(function (d) {
            d.x = parseFloat(d.x);
            d.y = parseFloat(d.y);
            //if two items have the exact same location,
            // that throws off the force-based layout
            var xy_string = d.x + d.y;
            while (xy_array.hasOwnProperty(xy_string)) {
                d.y += 0.00000001;
                xy_string = d.x + d.y;
            }

            xy_array[xy_string] = true;
            d.paper_abstract = _this.setToStringIfNullOrUndefined(d.paper_abstract, "");
            d.published_in = _this.setToStringIfNullOrUndefined(d.published_in, "");
            d.title = _this.setToStringIfNullOrUndefined(d.title,
                config.localization[config.language]["no_title"]);

            if (config.content_based === false) {
                d.readers = +d.readers;
                d.internal_readers = +d.readers + 1;
            } else {
                d.readers = 0;
                d.internal_readers = 1;
            }
            if (typeof highlight_data != 'undefined' && highlight_data !== null) {
                if (highlight_data.bookmarks_all !== null) {
                    highlight_data.bookmarks_all.forEach(function (x) {
                        var id_string = x.id;
                        id_string = id_string.toString();
                        if (id_string == d.id) {
                            d.readers += x.num;
                            d.internal_readers += x.num;
                        }
                    });
                }
            }

            d.paper_selected = false;

            // convert authors to "[first name] [last name]"
            // var authors = d.authors.split(";");
            var authors = _this.convertToFirstNameLastName(d.authors);
            d.authors_string = authors.string;
            d.authors_short_string = authors.short_string;
			
            d.oa = false;

            if (config.service === "doaj") {
                d.oa = true;
                d.oa_link = d.link;
            } else if (config.service === "plos") {
                d.oa = true;
                var journal = d.published_in.toLowerCase();
                d.oa_link = "http://journals.plos.org/" +
                    config.plos_journals_to_shortcodes[journal]
                  + "/article/asset?id=" + d.id + ".PDF";
            } else if (typeof d.pmcid !== "undefined") {
                if (d.pmcid !== "") {
                    d.oa = true;
                    d.oa_link = "http://www.ncbi.nlm.nih.gov/pmc/articles/" + d.pmcid + "/pdf/";
                }
            } else if(config.service === "base") {
                d.oa = (d.oa_state === 1 || d.oa_state === "1")?(true):(false);
                d.oa_link = d.link;
            } else {
				d.oa = (d.oa_state === 1 || d.oa_state === "1")?(true):(false);
			}

            d.outlink = _this.createOutlink(d);

        });

        mediator.publish("update_canvas_domains", cur_data);
        mediator.publish("update_canvas_data", cur_data);
        
        var areas = this.areas;
        cur_data.forEach(function (d) {
            var area = (config.use_area_uri) ? (d.area_uri) : (d.area);
            if (area in areas) {
                areas[area].papers.push(d);
            } else {
                areas[area] = {};
                areas[area].title = d.area;
                areas[area].papers = [d];
            }

            d.resized = false;
        });
        if (typeof highlight_data != 'undefined' && highlight_data !== null) {
            if (highlight_data.bookmarks !== null) {
                highlight_data.bookmarks.forEach(function (d) {

                    var index =cur_data.filter(function (x) {
                        return x.id == d.contentID;
                    });
                    if (index.length > 0) {
                        index[0].bookmarked = 1;
                    }
                });
            }

            if (highlight_data.recommendations !== null) {
                highlight_data.recommendations.forEach(function (d) {

                    var index =cur_data.filter(function (x) {
                        return x.id == d.contentID;
                    });
                    if (index.length > 0) {
                        index[0].recommended = 1;
                    }
                });
            }

        }

        this.data = cur_data;
    },

    // prepare the areas for the bubbles
    prepareAreas: function () {

        var areas = this.areas;
        var areas_array = this.areas_array;

        var readers = [];

        for (var area in areas) {
            var papers = areas[area].papers;
            var sum_readers = d3.sum(papers, function (d) {
                return d.internal_readers;
            });

            readers.push(sum_readers);
        }

        mediator.publish('canvas_set_domain', 'circle_size', d3.extent(readers));
        var area_x = [];
        var area_y = [];

        for (area in areas) {
            let papers = areas[area].papers;
            let sum_readers = d3.sum(papers, function (d) {
                return d.internal_readers;
            });

            areas[area].readers = sum_readers;

            var mean_x = d3.mean(papers, function (d) {
                return d.x;
            });
            var mean_y = d3.mean(papers, function (d) {
                return d.y*(-1);
            });

            area_x.push(mean_x);
            area_y.push(mean_y);

            areas[area].x = mean_x;
            areas[area].y = mean_y;
        }
        mediator.publish("set_area_radii", areas);
        mediator.publish('canvas_set_domain', 'chart_x_circle', d3.extent(area_x));
        mediator.publish('canvas_set_domain', 'chart_y_circle', d3.extent(area_y));

        for (area in areas) {
            var new_area = [];
            new_area.title = areas[area].title;
            mediator.publish("set_new_area_coords", new_area, areas[area]);
            new_area.orig_x = areas[area].x;
            new_area.orig_y = areas[area].y;
            new_area.r = areas[area].r;
            new_area.height_html = Math.sqrt(Math.pow(areas[area].r, 2) * 2);
            new_area.width_html = Math.sqrt(Math.pow(areas[area].r, 2) * 2);
            new_area.x_html = 0 - new_area.width_html / 2;
            new_area.y_html = 0 - new_area.height_html / 2;
            new_area.area_uri = area;
            new_area.readers = areas[area].readers;
            new_area.papers = areas[area].papers;
            areas_array.push(new_area);
        }
        this.areas = areas;
        this.areas_array = areas_array;
    },

    getData: function () {
        return this.data;
    },

    getAreas: function() {
        return this.areas;
    },

    createOutlink: function(d) {
        var url = false;
        if (config.service == "base") {
          url = d.oa_link;
        } else if(config.url_prefix !== null) {
            url = config.url_prefix + d.url;
        } else if (typeof d.url != 'undefined') {
            url = d.url;
        }

        return url;
    }
};
//var io = new IO();
export const io = new IO();
