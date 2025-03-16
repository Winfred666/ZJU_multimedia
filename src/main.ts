import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

import 'primeicons/primeicons.css'
import { useToast } from 'primevue/usetoast'


// color preset
const ColorPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{fuchsia.50}',
            100: '{fuchsia.100}',
            200: '{fuchsia.200}',
            300: '{fuchsia.300}',
            400: '{fuchsia.400}',
            500: '{fuchsia.500}',
            600: '{fuchsia.600}',
            700: '{fuchsia.700}',
            800: '{fuchsia.800}',
            900: '{fuchsia.900}',
            950: '{fuchsia.950}'
        },
    }
});

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(PrimeVue,{
    ripple: true,
    theme: {
        preset: ColorPreset,
        options: {
            prefix: 'p', // the prefix of class use by PrimeVue components, to prevent css class conflicts with tailwind.
            darkModeSelector: 'system',
            cssLayer: false
        }
    }
})

// set error config , use PrimeVue's Toast to show error message.
app.config.errorHandler = (err, vm, info) => {
    console.error(err, vm, info)
    useToast().add({
        severity: 'error',
        summary: 'Error',
        detail: err,
        life: 5000
    });
}

app.mount('#app')
