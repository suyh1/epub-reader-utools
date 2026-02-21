import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './main.less'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
