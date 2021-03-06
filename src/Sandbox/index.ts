import { ChildProcess, fork } from 'child_process';
import * as EventEmitter from 'events';
import * as path from 'path';

import { IConfig, IMessage } from '../models/sandbox.interface';
import { getDebug } from '../utils';

const kill = require('tree-kill');
const debug = getDebug('sandbox');

export class BrowserlessSandbox extends EventEmitter {
  private child: ChildProcess;
  private timer: NodeJS.Timer;

  constructor({ code, timeout, flags, useChromeStable }: IConfig) {
    super();

    this.child = fork(path.join(__dirname, 'child'));
    this.timer = setTimeout(() => {
      debug(`Timeout reached, killing child process`);
      this.close();
    }, timeout);

    this.child.on('message', (message: IMessage) => {
      if (message.event === 'launched') {
        debug(`Sandbox ready, forwarding location`);
        this.emit('launched', message.context);
      }
    });

    this.child.send({
      context: {
        code,
        flags,
        useChromeStable,
      },
      event: 'start',
    });
  }

  public close() {
    clearTimeout(this.timer);
    debug(`Closing child`);
    this.kill();
  }

  private kill() {
    kill(this.child.pid, 'SIGKILL');
  }
}
