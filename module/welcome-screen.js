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
            options.template = `systems/D35E/templates/welcome-screen.html`;
            options.resizable = false;
            options.width = 920;
            options.height = 730;
            options.classes = ["welcome-screen"];
            options.title = `${title} - Welcome Screen`;

            return options;
        }

        activateListeners(html) {
            super.activateListeners(html);
            this.createTabs($('html')[0])
            html.find('.show-again').on('change', ev => {
                let val = "0.0.0";
                if (ev.currentTarget.checked)
                    val = moduleVersion;

                game.settings.set(title, "version", val);
            })
        }

        createTabs(html) {
            const __tabs = new TabsV2({navSelector: ".welcome-tabs", contentSelector: ".welcome-content", initial: "welcome", active: "welcome"});
            __tabs.bind(html);
        }
    }

    (new WelcomeScreen()).render(true);
}
