export interface Preset {
  id: string;
  /** i18n key under the `presets` namespace for the display title. */
  titleKey: string;
  source: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'math',
    titleKey: 'presets.math',
    source: `public class Main {
    public static void main(String[] args) {
        int a = 5;
        int b = 3;
        int result = a + b * 2;
        System.out.println(result);
    }
}`,
  },
  {
    id: 'ifelse',
    titleKey: 'presets.ifelse',
    source: `public class Main {
    public static void main(String[] args) {
        int score = 85;
        if (score >= 50) {
            System.out.println("Pass");
        } else {
            System.out.println("Fail");
        }
    }
}`,
  },
  {
    id: 'loop',
    titleKey: 'presets.loop',
    source: `public class Main {
    public static void main(String[] args) {
        int sum = 0;
        for (int i = 1; i <= 3; i++) {
            sum = sum + i;
        }
        System.out.println(sum);
    }
}`,
  },
];
