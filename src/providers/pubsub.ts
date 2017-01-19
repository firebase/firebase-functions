import { Trigger, CloudFunction, AbstractFunctionBuilder } from './base';
import { Event } from '../event';
import { env } from '../env';

export function pubsub(topic: string) {
  return new pubsub.FunctionBuilder(env(), topic);
}

export namespace pubsub {
  export class Message {
    data: string;
    attributes: {[key: string]: string };
    private _json: any;

    constructor(data: any) {
      [this.data, this.attributes, this._json] =
        [data.data, data.attributes || {}, data.json];
    }

    get json(): any {
      if (typeof this._json === 'undefined') {
        this._json = JSON.parse(
          new Buffer(this.data, 'base64').toString('utf8')
        );
      }

      return this._json;
    }

    toJSON(): any {
      return {
        data: this.data,
        attributes: this.attributes,
      };
    }
  }

  export class FunctionBuilder extends AbstractFunctionBuilder {
    topic: string;
    event: string;

    constructor(env: env.Env, topic: string) {
      super(env);
      this.topic = topic;
    }

    onPublish(handler: (event: Event<Message>) => PromiseLike<any> | any): CloudFunction {
      return this._makeHandler(handler, 'topic.publish');
    }

    protected _toTrigger(event: string): Trigger {
      const format = new RegExp('^(projects/([^/]+)/topics/)?([^/]+)$');
      let match = this.topic.match(format);
      if (!match) {
        const errorString = 'Topic names must either have the format of'
          + ' "topicId" or "projects/<projectId>/topics/<topicId>".';
        throw new Error(errorString);
      }
      let [, , project, topic] = match;
      if (project && project !== process.env.GCLOUD_PROJECT) {
        throw new Error('Cannot use a topic that does not belong to this project.');
      }
      return {
        eventTrigger: {
          eventType: 'providers/cloud.pubsub/eventTypes/' + event,
          resource: 'projects/' + process.env.GCLOUD_PROJECT + '/topics/' + topic,
        },
      };
    }

    protected _dataConstructor(payload: any): Message {
      return new Message(payload.data);
    }
  }
}
