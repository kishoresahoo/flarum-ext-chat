import { extend } from 'flarum/extend';
import HeaderPrimary from 'flarum/components/HeaderPrimary';

import {ChatFrame,ChatMessage} from 'pushedx/realtime-chat/components/ChatFrame';

app.initializers.add('pushedx-realtime-chat', app => {

    let status = {
        loading: false,
        autoScroll: true,
        oldScroll: 0,
        callback: null,
        beingShown: JSON.parse(localStorage.getItem('beingShown')) || false,

        _init: false,
        _messages: [],

        // Getter because app.store.getById returns null if executed now... Why??
        get messages() {
            if (!this._init) {
                this._messages = (JSON.parse(localStorage.getItem('messages')) || [])
                    .map(function(message){
                        if (message.user.data)
                            return message;

                        var user = app.store.getById('users', message.user);
                        var obj = new ChatMessage(user, message.message);

                        if (user == undefined)
                        {
                            app.store.find('users', message.user).then(function(user){
                                obj.user = user;
                                m.redraw();
                            });
                        }

                        return obj;
                    });

                this._init = true;
            }

            return this._messages;
        },

        set messages(message) {
            this._messages.push(message);
        }
    };

    extend(HeaderPrimary.prototype, 'config', function(x, isInitialized, context) {
        if (isInitialized) return;

        app.pusher.then(channels => {
            channels.main.bind('newChat', data => {
                var user = app.store.getById('users', data.actorId);
                var obj = status.callback(data.message, user, data.actorId);

                if (user == undefined)
                {
                    app.store.find('users', data.actorId).then(function(user){
                        obj.user = user;
                        m.redraw();
                    });
                }
            });

            extend(context, 'onunload', () => channels.main.unbind('newChat'));
        });
    });

    /**
     * Add the upload button to the post composer.
     */
    extend(HeaderPrimary.prototype, 'items', function(items) {
        var chatFrame = new ChatFrame;
        chatFrame.status = status;
        status.callback = chatFrame.addMessage.bind(chatFrame);
        items.add('pushedx-chat-frame', chatFrame);
    });
});
