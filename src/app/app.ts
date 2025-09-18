import { Component } from '@angular/core';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.components';

@Component({
  selector: 'app-root',
  imports: [ChatWidgetComponent],
  template: `<div class="widget"><chat-widget/></div>`
})

export class App { }
