import { createTabs } from "./lib.js";

export default function renderOnboardingScreen() {
    const system = game.system;
    const moduleId = system.id;
    const title = "D35E";
    const moduleVersion = system.data.version;
    game.settings.register(title, '__onboarding', {
        name: `Tutorial shown`,
        hint: 'Basic system usage tutorial already shown. Uncheck to view again after reload.',
        default: false,
        type: Boolean,
        config: true,
        scope: 'client',
    });
    const onboarding = game.settings.get(title, "__onboarding") || game.settings.get(title, "__onboardingHidden");

    if (onboarding)
        return;

    class OnboardingScreen extends Application {
        static get defaultOptions() {
            const options = super.defaultOptions;
            options.template = `systems/D35E/templates/onboarding.html`;
            options.resizable = false;
            options.width = 600;
            options.height = 195;
            options.top = $( window ).height() - 320;
            options.classes = ["onboarding"];

            return options;
        }

        activateListeners(html) {
            super.activateListeners(html);
            html.find('.show-again').on('click', ev => {
                game.settings.set(title, "__onboarding", true);
                this.close()
            })
        }

    }

    (new OnboardingScreen()).render(true);
}
