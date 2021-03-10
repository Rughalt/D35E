import { createTabs } from "./lib.js";

export default function renderWelcomeScreen() {
    const system = game.system;
    const moduleId = system.id;
    const title = system.data.title;
    const moduleVersion = system.data.version;
    game.settings.register(title, 'version', {
        name: `${title} Version`,
        default: "0.0.0",
        type: String,
        scope: 'world',
    });
    const oldVersion = game.settings.get(title, "version");

    if (!isNewerVersion(moduleVersion, oldVersion))
        return;

    class WelcomeScreen extends Application {
        static get defaultOptions() {
            const options = super.defaultOptions;
            options.template = `systems/D35E/templates/demo-screen.html`;
            options.resizable = true;
            options.width = 920;
            options.height = 730;
            options.classes = ["welcome-screen"];
            options.title = `${title} - Demo`;

            return options;
        }

        activateListeners(html) {
            super.activateListeners(html);
            this.createTabs($('html')[0])
        }

        createTabs(html) {
            const __tabs = new TabsV2({navSelector: ".welcome-tabs", contentSelector: ".welcome-content", initial: "welcome", active: "welcome"});
            __tabs.bind(html);
        }
    }

    (new WelcomeScreen()).render(true);
}
