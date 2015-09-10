(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

(function () {
  // Add Angular integrations if Angular is available
  if (typeof angular === 'object' && angular.module) {

    var IonicAngularDeploy = null;

    angular.module('ionic.service.deploy', []).factory('$ionicDeploy', [function () {
      if (!IonicAngularDeploy) {
        IonicAngularDeploy = new Ionic.Deploy();
      }
      return IonicAngularDeploy;
    }]);
  }
})();

},{}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function () {

  var Settings = new Ionic.IO.Settings();
  var DeferredPromise = Ionic.IO.DeferredPromise;

  var NO_PLUGIN = "IONIC_DEPLOY_MISSING_PLUGIN";
  var INITIAL_DELAY = 1 * 5 * 1000;
  var WATCH_INTERVAL = 1 * 60 * 1000;

  var Deploy = (function () {

    /**
     * Ionic Deploy
     *
     * This is the main interface that talks with the Ionic Deploy Plugin to facilitate
     * checking, downloading, and loading an update to your app.
     *
     * Base Usage:
     *
     *    Ionic.io();
     *    var deploy = new Ionic.Deploy();
     *    deploy.check().then(null, null, function(hasUpdate) {
     *      deploy.update();
     *    });
     *
     * @constructor
     */

    function Deploy() {
      _classCallCheck(this, Deploy);

      var self = this;
      this.logger = new Ionic.IO.Logger({
        'prefix': 'Ionic Deploy:'
      });
      this._plugin = false;
      this._isReady = false;
      this._channelTag = 'production';
      this._emitter = Ionic.IO.Core.getEmitter();
      this.logger.info("init");
      Ionic.IO.main.onReady(function () {
        self._isReady = true;
        self._emitter.emit('ionic_deploy:ready');
      });
    }

    /**
     * Fetch the Deploy Plugin
     *
     * If the plugin has not been set yet, attempt to fetch it, otherwise log
     * a message.
     *
     * @return {IonicDeploy} Returns the plugin or false
     */

    _createClass(Deploy, [{
      key: '_getPlugin',
      value: function _getPlugin() {
        if (this._plugin) {
          return this._plugin;
        }
        if (typeof IonicDeploy === 'undefined') {
          this.logger.info('plugin is not installed or has not loaded. Have you run `ionic plugin add ionic-plugin-deploy` yet?');
          return false;
        }
        this._plugin = IonicDeploy;
        return IonicDeploy;
      }

      /**
       * Initialize the Deploy Plugin
       * @return {void}
       */
    }, {
      key: 'initialize',
      value: function initialize() {
        if (this._getPlugin()) {
          this._plugin.initialize(Settings.get('app_id'));
        }
      }

      /**
       * Check for updates
       *
       * @return {Promise} Will resolve with true if an update is available, false otherwise. A string or
       *   error will be passed to reject() in the event of a failure.
       */
    }, {
      key: 'check',
      value: function check() {
        var self = this;
        var deferred = new DeferredPromise();

        if (this._getPlugin()) {
          this._plugin.check(Settings.get('app_id'), this._channelTag, function (result) {
            if (result && result === "true") {
              self.logger.info('an update is available');
              deferred.resolve(true);
            } else {
              self.logger.info('no updates available');
              deferred.resolve(false);
            }
          }, function (error) {
            self.logger.error('encountered an error while checking for updates');
            deferred.reject(error);
          });
        } else {
          deferred.reject(NO_PLUGIN);
        }

        return deferred.promise;
      }

      /**
       * Download and available update
       *
       * This should be used in conjunction with extract()
       * @return {Promise} The promise which will resolve with true/false or use
       *    notify to update the download progress.
       */
    }, {
      key: 'download',
      value: function download() {
        var self = this;
        var deferred = new DeferredPromise();

        if (this._getPlugin()) {
          this._plugin.download(Settings.get('app_id'), function (result) {
            if (result !== 'true' && result !== 'false') {
              deferred.notify(result);
            } else {
              if (result === 'true') {
                self.logger.info("download complete");
              }
              deferred.resolve(result === 'true');
            }
          }, function (error) {
            deferred.reject(error);
          });
        } else {
          deferred.reject(NO_PLUGIN);
        }

        return deferred.promise;
      }

      /**
       * Extract the last downloaded update
       *
       * This should be called after a download() successfully resolves.
       * @return {Promise} The promise which will resolve with true/false or use
       *                   notify to update the extraction progress.
       */
    }, {
      key: 'extract',
      value: function extract() {
        var self = this;
        var deferred = new DeferredPromise();

        if (this._getPlugin()) {
          this._plugin.extract(Settings.get('app_id'), function (result) {
            if (result !== 'done') {
              deferred.notify(result);
            } else {
              self.logger.info("extraction complete");
              deferred.resolve(result);
            }
          }, function (error) {
            deferred.reject(error);
          });
        } else {
          deferred.reject(NO_PLUGIN);
        }

        return deferred.promise;
      }

      /**
       * Load the latest deployed version
       * This is only necessary to call if you have manually downloaded and extracted
       * an update and wish to reload the app with the latest deploy. The latest deploy
       * will automatically be loaded when the app is started.
       *
       * @return {void}
       */
    }, {
      key: 'load',
      value: function load() {
        if (this._getPlugin()) {
          this._plugin.redirect(Settings.get('app_id'));
        }
      }

      /**
       * Watch constantly checks for updates, and triggers an
       * event when one is ready.
       * @param {object} options Watch configuration options
       * @return {Promise} returns a promise that will get a notify() callback when an update is available
       */
    }, {
      key: 'watch',
      value: function watch(options) {
        var deferred = new DeferredPromise();
        var opts = options || {};
        var self = this;

        if (typeof opts.initialDelay === 'undefined') {
          opts.initialDelay = INITIAL_DELAY;
        }
        if (typeof opts.interval === 'undefined') {
          opts.interval = WATCH_INTERVAL;
        }

        function checkForUpdates() {
          self.check().then(function (hasUpdate) {
            if (hasUpdate) {
              deferred.notify(hasUpdate);
            }
          }, function (err) {
            self.logger.info('unable to check for updates, ', err);
          });

          // Check our timeout to make sure it wasn't cleared while we were waiting
          // for a server response
          if (this._checkTimeout) {
            this._checkTimeout = setTimeout(checkForUpdates.bind(self), opts.interval);
          }
        }

        // Check after an initial short deplay
        this._checkTimeout = setTimeout(checkForUpdates.bind(self), opts.initialDelay);

        return deferred.promise;
      }

      /**
       * Stop automatically looking for updates
       * @return {void}
       */
    }, {
      key: 'unwatch',
      value: function unwatch() {
        clearTimeout(this._checkTimeout);
        this._checkTimeout = null;
      }

      /**
       * Information about the current deploy
       *
       * @return {Promise} The resolver will be passed an object that has key/value
       *    pairs pertaining to the currently deployed update.
       */
    }, {
      key: 'info',
      value: function info() {
        var deferred = new DeferredPromise();

        if (this._getPlugin()) {
          this._plugin.info(Settings.get('app_id'), function (result) {
            deferred.resolve(result);
          }, function (err) {
            deferred.reject(err);
          });
        } else {
          deferred.reject(NO_PLUGIN);
        }

        return deferred.promise;
      }

      /**
       * Set the deploy channel that should be checked for updatse
       * See http://docs.ionic.io/docs/deploy-channels for more information
       *
       * @param {string} channelTag The channel tag to use
       * @return {void}
       */
    }, {
      key: 'setChannel',
      value: function setChannel(channelTag) {
        this._channelTag = channelTag;
      }

      /**
       * Update app with the latest deploy
       *
       * @return {Promise} A promise result
       */
    }, {
      key: 'update',
      value: function update() {
        var deferred = new DeferredPromise();
        var self = this;

        if (this._getPlugin()) {
          // Check for updates
          self.check().then(function (result) {
            if (result === true) {
              // There are updates, download them
              var downloadProgress = 0;
              self.download().then(function (result) {
                if (!result) {
                  deferred.reject("download error");
                }
                self.extract().then(function (result) {
                  if (!result) {
                    deferred.reject("extraction error");
                  }
                  self._plugin.redirect(Settings.get('app_id'));
                }, function (error) {
                  deferred.reject(error);
                }, function (update) {
                  var progress = downloadProgress + update / 2;
                  deferred.notify(progress);
                });
              }, function (error) {
                deferred.reject(error);
              }, function (update) {
                downloadProgress = update / 2;
                deferred.notify(downloadProgress);
              });
            } else {
              deferred.resolve(false);
            }
          }, function (error) {
            deferred.reject(error);
          });
        } else {
          deferred.reject(NO_PLUGIN);
        }

        return deferred.promise;
      }

      /**
       * Fire a callback when deploy is ready. This will fire immediately if
       * deploy has already become available.
       *
       * @param {Function} callback Callback function to fire off
       * @return {void}
       */
    }, {
      key: 'onReady',
      value: function onReady(callback) {
        var self = this;
        if (this._isReady) {
          callback(self);
        } else {
          self._emitter.on('ionic_deploy:ready', function () {
            callback(self);
          });
        }
      }
    }]);

    return Deploy;
  })();

  Ionic.namespace('Ionic', 'Deploy', Deploy, window);
})();

},{}]},{},[2,1]);
