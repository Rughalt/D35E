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
            options.resizable = true;
            options.width = 450;
            options.height = 600;
            options.classes = ["welcome-screen"];
            options.title = `${title} - Welcome Screen`;
            return options;
        }

        activateListeners(html) {
            super.activateListeners(html);

            html.find('.show-again').on('change', ev => {
                let val = "0.0.0";
                if (ev.currentTarget.checked)
                    val = moduleVersion;

                game.settings.set(title, "version", val);
            })
        }
    }

    (new WelcomeScreen()).render(true);
}