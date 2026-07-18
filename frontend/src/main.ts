import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import './style.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { vReveal } from './directives/reveal'
import { installErrorReporting } from './services/errorReporting'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(createHead())
app.directive('reveal', vReveal)
installErrorReporting(app)

app.mount('#app')
