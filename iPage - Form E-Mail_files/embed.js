Evergage.SurveyHooks = (function(){

    // populated with all required selectors, action names, custom field names and UI effect options.
    // ++ logging flag
    var confObj = {
        logging: window.evergageSurveyConfig.logging,
        opts: setSurveyConfigFromSiteWide(window.evergageSurveyConfig),
        ui: setSurveyInterfaceConfigFromSiteWide(window.evergageSurveyConfig),
        evergageTooltip: '#evergage-tooltip-amb'
    };

    // Flag for keeping track of how many times we've called the drop down handler
    // Used to hold off on executing the Tapp Service until all evergage card campaigns are on
    var dropDownsInitialized = 0,
        embedServiceLoaded = false;

    var evergageLog = window.evergageLog;
    // Handle Logging Configuration when evergage logging library is unavailable.
    // Forces any call to evergageLog.shouldLog() to return true and qualify the following console.log()
    if (!evergageLog) {
        evergageLog = (function(){
            'use strict';
            var publicVariable = {};
            publicVariable.shouldLog = shouldLog;
            function shouldLog() {
                if (window.evergageSurveyConfig.logging === true) {
                    return true;
                } else {
                    return false;
                }
            }
            return publicVariable;
        })();  
    }

    // Populated with selectors for Question components, sourced from siteWideJS configuration object
    var Question = setSurveyQuestionSelectors(window.evergageSurveyConfig),
    // Contains current and total questions for use in driving progress bar UI
    SurveyProgress = {},

    // Flag to prevent double execution of message JS Tab
    // TODO: Remove?.. probably.
    evg_survey_frame_clicked = false;
    // Default false on the mouseOver flag
    confObj.opts.iframeMouseOver = false;
    // local error logging object returned via utility function
    var surveyErrorLog = {};

    if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[EXTENSIONS] Succesfully loaded Survey Extension","color: WHITE;");

    // loops through passed in object and returns false if any key/value pairs are invalid or empty strings
    function isCompleteAndValidObject(object) {
        for (var key in object) {
            var prop = object[key];
            if (!prop || prop.length === 0 || prop === "") {
                return false;
            }
        }
        return true;
    }

    // helps confirm that a provided messageId is both valid and relates to an evergage tooltip jQuery object
    function isValidToolTip(messageId) {
        if (messageId && messageId !== "" && ajq(confObj.evergageTooltip + messageId).length > 0) {
            return true;
        } else {
            return false;
        }
    }

    function isValidMessageId(string) {
        return (typeof string === "string" && string.length === 5);
    }

    // obtains corresponding experinceId by utilizing qtip() options
    function getExperienceId(messageId) {
        if (isValidToolTip(messageId)) {
            var _experienceId = ajq(confObj.evergageTooltip + messageId).qtip().options.bundle.experienceId;
            if (_experienceId && _experienceId !== "") {
                return _experienceId;
            } else {
                return;
            }
        } else {
            if (evergageLog.shouldLog("DEBUG")) console.log("Evergage: %c[SurveyEngine] Failed to obtain an expeienceId, aborting survey handling.","color: WHITE;");
            return false;
        }
    }

    // Simplifies? moves? Idk, take the option object from the version in sitewide and seperate it out to more relvant names.
    // populates confObj.opts 
    function setSurveyConfigFromSiteWide(config) {
        return {
            // General system settings
            totalQuestions: config.totalQuestions,
            answerActionName: config.answerActionName,
            clickNextActionName: config.clickNextActionName,
            clickSkipActionName: config.clickSkipActionName,
            lastOptionSelectedField: config.lastOptionSelectedField,
            lastQuestionNameField: config.lastQuestionNameField,
            lastQuestionNumberField: config.lastQuestionNumberField,
            // Source of embed javascript - set in siteWideJS configuration object
            pluginSources: config.embedPlugins
        };
    }

    // populates confObj.ui
    function setSurveyInterfaceConfigFromSiteWide(config) {
        return {
            theme: config.ui.theme,
            responseCard: {
                totalCards: config.totalCardsToShowOnCompletion,
                inlineActive: config.inlineResponseCardsActive,
                completedActive: config.completedResponseCardsActive,
                selector: config.responseCardDiv,
                $element: ajq(config.responseCardDiv)
            },
            buttonRevealSpeed: config.ui.buttonRevealSpeed,
            fadeInSpeed: config.ui.animationSpeeds.fadeIn,
            fadeOutSpeed: config.ui.animationSpeeds.fadeOut,
            slideUpSpeed: config.ui.animationSpeeds.slideUp,
            slideDownSpeed: config.ui.animationSpeeds.slideDown,
            handleSelectionDelay: config.ui.delayHandlingSelectionBy,
            buttonDelayInMs: (config.ui.buttonRevealDelay * 1000),
            questionSlideDownDelay: 250   
        };
    }

    // populates Question object with CSS selectors from siteWide
    function setSurveyQuestionSelectors(config) {
        return config.questionSelectors;
    }

    function loadEmbededService(src) {
        var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
            g.type = 'text/javascript'; g.defer = false; g.async = false;
            g.src = document.location.protocol + src;
            g.id = 'evgSurveyEmbedService';
            s.parentNode.insertBefore(g, s);
    }

    function iFrameEventHandler(frameId, callback) {

        // listen for blur on window
        window.addEventListener('blur', function() {
            if (confObj.opts.iframeMouseOver) {
                callback();
            }
        });
        // we can't detect clicks, but we know if the mouse is over the iframe ID provided
        document.getElementById(frameId).addEventListener('mouseover', function() {
            confObj.opts.iframeMouseOver = true;
        });
        document.getElementById(frameId).addEventListener('mouseout', function() {
            confObj.opts.iframeMouseOver = false;
        });
    }

    function surveyUI($SurveyElements, messageId){

        if (!messageId || !isCompleteAndValidObject($SurveyElements)) {
            if (evergageLog.shouldLog("DEBUG")) console.log("Evergage: %c[SurveyEngine] Failed executing surveyUI handling as an invalid messadeId was provided","color: WHITE;");
            return;
        }

        // Hide the control container, and hide the next button - it will only appear after an inline card displays.
        ajq(Question.controls.next).hide();
        ajq(Question.controls.container).hide();
        // Hide the question itself so that we can execute the dropDown effect.
        ajq(Question.container).hide();

        updateSurveyProgressBar({
            total: confObj.opts.totalQuestions,
            answered: (ajq(Question.container).data('question-number') - 1)
        });
        
        // TODO: make this cofigurable so we can turn it off via message invoke code
        // delay revealing question
        setTimeout(function(){
            ajq(Question.container).slideDown(confObj.ui.slideDownSpeed);
        },confObj.ui.questionSlideDownDelay);
        
        // watch for mouse entering survey parent evergage message
        // Start countdown to reveal skip/next buttons
        $SurveyElements.evgParent.on({
            mouseenter: function() {
                startTimerForControlsReveal();
            },
            mouseleave: function() {
                clearTimeout(window.evg_timer_controlReveal);
            }
        });
        $SurveyElements.options.on({
            click: function() {
                clearTimeout(window.evg_timer_controlReveal);
                window.evg_timer_controlReveal = null;
                // if an option was already selected, clear it
                $SurveyElements.options.removeClass('selected');
                // Obtains clicked list-item index, increments so that the scale is 1+ and not 0+
                var optionIndex = ajq(Question.options.option).index(this);
                optionIndex++;
                // change the clicked button to a selected/active state
                // don't handle selection until toggleclass has completed
                ajq(this).toggleClass('selected',handleSelection({
                    question: ajq(Question.container).data('question-name'),
                    questionNumber: String(ajq(Question.container).data('question-number')),
                    choice: ajq(this).data('answer'),
                    choiceNumber: String(optionIndex)
                }));
            }
        });
        $(Question.controls.next).on({
            click: function() {
                handleNextClick();
                // Evergage.trackAction(confObj.opts.clickNextActionName);
            }
        });
        $(Question.controls.skip).on({
            click: function() {
                handleSkippedQuestion({
                    question: ajq(Question.container).data('question-name'),
                    questionNumber: String(ajq(Question.container).data('question-number'))
                });
                // Evergage.trackAction(confObj.opts.clickSkipActionName);
            }
        });

    }

    function handleSelection(selection){
        if (!isCompleteAndValidObject(selection)) {
            if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[SurveyEngine] Failed to handle selection - argument(s) invalid.", selection,"color: WHITE;");
            return false;
        } else {
            if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[SurveyEngine] Question choice selection made, executing evergage API call in " + confObj.ui.handleSelectionDelay + " milliseconds","color: WHITE;");
            Evergage.setCustomField(confObj.opts.lastOptionSelectedField, selection.choiceNumber, Evergage.Scope.Request);
            Evergage.setCustomField(selection.question, selection.choice, Evergage.Scope.Request);
            Evergage.setCustomField(confObj.opts.lastQuestionNumberField , selection.questionNumber, Evergage.Scope.Request);
            Evergage.setCustomField(confObj.opts.lastQuestionNameField , selection.question, Evergage.Scope.Request);

            trackSurveyOptionClickThrough(confObj.opts.campaign.experienceId,confObj.opts.campaign.messageId);

            // Modify the progress bar as an idication of recognized answer
            ajq(Question.progressBar).removeClass('evg-progress-bar-success').addClass('active');
            updateSurveyProgressBar({
                total: confObj.opts.totalQuestions,
                answered: selection.questionNumber
            });

            setTimeout(function(){
                // track a clickthrough when an option was selected
                
                if (confObj.ui.responseCard.inlineActive === false) {
                    ajq(Question.container).slideUp(confObj.ui.slideUpSpeed, function(){
                        hideQuestionParent(confObj.opts.campaign.messageId);
                        Evergage.trackAction(confObj.opts.answerActionName);
                    });
                    
                }
                
            },confObj.ui.handleSelectionDelay);
        }
    }

    function handleSkippedQuestion(skippedSelection) {
        Evergage.setCustomField(skippedSelection.question, 'skipped', Evergage.Scope.Request);
        Evergage.setCustomField(confObj.opts.lastQuestionNumberField , skippedSelection.questionNumber, Evergage.Scope.Request);
        Evergage.setCustomField(confObj.opts.lastQuestionNameField , skippedSelection.question, Evergage.Scope.Request);
        hideQuestionParent(confObj.opts.campaign.messageId);
        Evergage.trackAction(confObj.opts.clickSkipActionName);
    }

    function handleNextClick() {
        // used only when inline response cards are active to submit answers and reveal the next question in the lineup
        // TODO:.. damnit figure this out. handleSelection() will have been called by now, so the data needed for the next
        // question is already up on evergage. Hide the parent evergage tooltip and qualify the next question? idk.
    }

    function calculatePercentage(current,total) {
        
        if (!current || !total) {
            return;
        } else {
            // this is literally used for UI effects only
            var rawCalculation = (current/total),
                percentageInteger = (rawCalculation * 100),
                stringyPercentage = percentageInteger + '%';
            return stringyPercentage;
        }

    }

    // called by each question when they load, and again when a selection is made to produce the animated increase.
    function updateSurveyProgressBar(progress) {

        var percentageComplete = calculatePercentage(progress.answered,progress.total);
        var progressCopy = percentageComplete;

        // if the current question number is 1, we force a progress state of 10% with a 0% label.
        if (progress.answered === 0) {
            percentageComplete = '10%';
            progressCopy = '0%';
        }

        // Take either the provided data, or the forced data from above and modify the progress bar
        ajq(Question.progressBar).css('width',percentageComplete);
        ajq(Question.progressText).html(progressCopy);

    }

    // used for displaying qualified content immediately following an answered question, within the same campaign where the question was loaded.
    function showInlineResponseCard(){
        if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[SurveyEngine] Attempting to show inline question response card...","color: WHITE;");
        // hide skip button
        ajq(Question.controls.skip).fadeOut(confObj.ui.fadeOutSpeed);
        // show next nav button
        ajq(Question.controls.next).fadeIn(confObj.ui.fadeInSpeed);
        // reveal the content card
        ajq(confObj.ui.responseCard.selector).slideDown(confObj.ui.slideDownSpeed);
        // hide question and it's options
        ajq(Question.options.container).slideUp(confObj.ui.slideUpSpeed);
        ajq(Question.text).slideUp(confObj.ui.slideUpSpeed);
    }

    // used for displaying qualified content following the completion of all possible questions
    function showCompletedResponseCard() {
        if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[SurveyEngine] Attempting to show completed survey response card(s)...","color: WHITE;");
        // reveal the content card

        ajq(confObj.ui.responseCard.selector).slideDown(confObj.ui.slideDownSpeed);
        
    }

    // Hides the loading process indicator shown when we are processing the embed service
    function hideContentCardLoader(callback) {
        ajq(Question.loadingBox).slideUp('slow',callback());
    }

    function hideQuestionParent(messageId) {
        if (!messageId) {
            return;
        } else {
            Evergage.hideBundle(messageId);
        }
    }

    function hideResponseCardParent(messageId) {
        if (!messageId) {
            return;
        } else {
            Evergage.hideBundle(messageId);
        }
    }

    function startTimerForControlsReveal() {
        window.evg_timer_controlReveal = setTimeout(function(){
            ajq(Question.controls.container).slideDown(confObj.opts.buttonRevealSpeed);
        },confObj.opts.buttonDelayInMs);
    }

    // Tracks a clickthrough for the campaign/experience representing the question so that statsUI clickthroughs are a metric of actual answers.
    function trackSurveyOptionClickThrough(experienceId,messageId) {
        if (evergageLog.shouldLog("DEBUG")) console.log("Evergage: %c[SurveyEngine] Tracking clickthrough on experienceId: " + experienceId + " messageId: " + messageId,"color: WHITE;");
        Evergage.trackClickthrough({ experienceId: experienceId, id: messageId }, window.location.href );
    }

    // Tracks a clickthrough for the campaign/experience containing a dropped down content card
    function trackResponseCardClickThrough(experienceId,messageId) {
        if (evg_survey_frame_clicked === false) {
            Evergage.trackClickthrough({ experienceId: experienceId, id: messageId }, window.location.href );
        }
        // TODO: Is this still neccesary?
        evg_survey_frame_clicked = true;
    }

    function handleStaticCardClickthrough(experienceId,messageId) {
        if (evergageLog.shouldLog("DEBUG")) console.log("Evergage: %c[SurveyEngine] Binding trackClickthrough on experienceId: " + experienceId + " messageId: " + messageId,"color: WHITE;");
        $('#evergage-tooltip-amb' + messageId +' .evg-card-dropDown').on({
            click: function() {
                Evergage.trackClickthrough({ experienceId: experienceId, id: messageId }, window.location.href );
            }
        });
    }

    return {

        getErrorLog: function() {
            return surveyErrorLog;
        },

        // will only be called once to setup the enclosing dataset with required fields
        // hence the alert(); 
        setup: function() {
            Evergage.setCustomField(confObj.opts.lastOptionSelectedField, 'blank', Evergage.Scope.Request);
            Evergage.setCustomField(confObj.opts.lastQuestionNumberField , 'blank', Evergage.Scope.Request);
            Evergage.setCustomField(confObj.opts.lastQuestionNameField , 'blank', Evergage.Scope.Request);
            Evergage.trackAction(confObj.opts.answerActionName);
            alert('Survey Succesfully Setup.');

        },

        resetToFauxNewUser: function() {
            Evergage.setCustomField('isFakeLessThan30Days' , 'true', Evergage.Scope.Request);
            Evergage.setCustomField(confObj.opts.lastQuestionNumberField , '0', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.AcctType' , 'blank', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.PrimaryGoal' , 'blank', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.SalesLocation' , 'blank', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.WebsitePlan' , 'blank', Evergage.Scope.Request);

            ajq('.evergage-tooltip').remove();
            Evergage.trackAction('resetEvergageSurvey');
            alert('You now look like a new user whose signed up within the last 30 days. THE PAGE WILL RELOAD!');
            location.reload();

        },

        // will only be called by someone testing.
        resetToFauxExistingUser: function() {
            Evergage.setCustomField(confObj.opts.lastQuestionNumberField , '0', Evergage.Scope.Request);
            Evergage.setCustomField('isFakeLessThan30Days' , 'false', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.AcctType' , 'blank', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.PrimaryGoal' , 'blank', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.SalesLocation' , 'blank', Evergage.Scope.Request);
            Evergage.setCustomField('User.Profile.WebsitePlan' , 'blank', Evergage.Scope.Request);

            ajq('.evergage-tooltip').remove();
            Evergage.trackAction('resetEvergageSurvey');
            alert('You now look like a new user who signed up more than 30 days ago. THE PAGE WILL RELOAD!');
            location.reload();
        },

        // TODO: Determine if this is useful anymore.
        // It is... kind of required actually for the cards following a survey
        dropDownController: function(msgConfObj) {

            if ((!msgConfObj || typeof msgConfObj !== "object") || (msgConfObj && !isValidToolTip(msgConfObj.messageId))) {
                if (evergageLog.shouldLog("DEBUG")) console.log("Evergage: %c[SurveyEngine] Cannot handle selection without all 3 selection properties!", selection,"color: WHITE;");
                return;
            }

            // ajq(Question.container).hide();

            confObj.opts.campaign = {
                experienceId: getExperienceId(msgConfObj.messageId),
                messageId: msgConfObj.messageId 
            };
            // confObj.ui.questionSlideDownDelay = msgConfObj.slideDownDelay;

            // setTimeout(function(){
            //     ajq(Question.container).slideDown('slow');
            // },1000);

        },

        question: function(msgConfObj) {
            if (evergageLog.shouldLog("INFO")) console.log("Evergage: [SurveyEngine] Attemping to initialize SurveyHook Question handling with configuration object: ", msgConfObj);

            if ((!msgConfObj || typeof msgConfObj !== "object") || (msgConfObj && !isValidToolTip(msgConfObj.messageId))) {
                if (evergageLog.shouldLog("DEBUG")) console.log("Evergage: %c[SurveyEngine] Cannot handle selection without all 3 selection properties!", selection);
                return;
            }
            confObj.opts.buttonDelayInMs = msgConfObj.skipDelay * 1000;
            confObj.opts.campaign = {
                experienceId: getExperienceId(msgConfObj.messageId),
                messageId: msgConfObj.messageId 
            };
            // if (msgConfObj.slideDownDelay) {
            //     confObj.ui.questionSlideDownDelay = msgConfObj.slideDownDelay;
            // }
            confObj.questionParentDiv = ajq(confObj.evergageTooltip + msgConfObj.messageId);
            // meh.. clean this shit
            surveyUI({
                evgParent: ajq(confObj.evergageTooltip + msgConfObj.messageId),
                question: ajq(confObj.evergageTooltip + msgConfObj.messageId + '>' + Question.container),
                options: ajq(confObj.evergageTooltip + msgConfObj.messageId + '>' + Question.container + '>' + Question.options.option),
            }, msgConfObj.messageId);

        },
        completedSurveyCards: function(service) {

            setTimeout(function(){
                loadEmbededService(confObj.opts.pluginSources[service]);
            },1500);

            if (confObj.ui.responseCard.completedActive === true) {
                setTimeout(function(){
                    // execute UI effects, show tapp card, reveal next buttons
                    hideContentCardLoader(showCompletedResponseCard);
                }, 3000);
            }

        },
        // service is a string representing the property name of confObj.opts.pluginSources
        dropDown: function(messageId, service) {

            dropDownsInitialized++;

            // no service JS link provided, fail out
            if (!service) {
                if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[SurveyEngine] Failed to initialize SurveyHook dropdown handling, no emded service was provided","color: RED;");
                return;
            }
            // no messageId provided
            if (!messageId || (messageId && !isValidToolTip(messageId))){
                if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[SurveyEngine] Failed to initialize SurveyHook dropdown handling, missing or invalid messageId","color: RED;");
                if (isValidMessageId(messageId)) {
                    // looks like a valid messageId, but we couldn't find a matching jQuery object
                    // expose the arguments to an error log, and include access to run the messageId against the tooltip validation tool
                    surveyErrorLog = {
                        messageId: messageId,
                        check: function() {
                            isValidToolTip(messageId);
                        }
                    };
                } else {
                    if (evergageLog.shouldLog("INFO")) console.log("Evergage: %c[SurveyEngine] messageId is formatted incorrectly. The message Id must be atleast 5 characters long.","color: RED;");
                } 
                return;
            }

            // confirms that the messageId passed in matches an existing evergage tooltip
            if (service && isValidToolTip(messageId)) {

                var dropDownCampaign = {
                    experienceId: getExperienceId(messageId),
                    messageId: messageId
                };

                handleStaticCardClickthrough(dropDownCampaign.experienceId,dropDownCampaign.messageId);

            } else {
                return;
            }


        }

    };

})();