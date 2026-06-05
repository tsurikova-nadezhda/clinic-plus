import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "../components/Logo";
import { Button, Field } from "../components/ui";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { colors, space, typography, radius } from "../lib/theme";

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
    } catch (e) {
      setError(
        e instanceof ApiError
          ? mapError(e)
          : "Не удалось подключиться к серверу. Проверьте сеть.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Logo size={44} />
          <Text style={styles.tagline}>Научно-образовательная платформа для врачей</Text>
        </View>

        <View style={styles.form}>
          <Text style={typography.h2}>
            {mode === "login" ? "Вход" : "Регистрация врача"}
          </Text>

          {mode === "register" && (
            <Field label="Имя" value={name} onChangeText={setName} placeholder="Иванова А.В." autoCapitalize="sentences" />
          )}
          <Field
            label="Email" value={email} onChangeText={setEmail}
            placeholder="doctor@clinic.ru" keyboardType="email-address" autoCapitalize="none"
          />
          <Field label="Пароль" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={mode === "login" ? "Войти" : "Создать аккаунт"}
            onPress={submit}
            loading={busy}
            disabled={!email || !password || (mode === "register" && !name)}
          />
          <Button
            title={mode === "login" ? "У меня нет аккаунта" : "Уже есть аккаунт — войти"}
            variant="ghost"
            onPress={() => { setError(null); setMode(mode === "login" ? "register" : "login"); }}
          />
        </View>

        <Text style={styles.hint}>
          Регистрация доступна только врачам. Доступ руководителя выдаётся вручную.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mapError(e: ApiError): string {
  if (e.status === 401) return "Неверный email или пароль.";
  if (e.status === 409) return "Этот email уже зарегистрирован.";
  if (e.status === 403) return "Регистрация как руководитель недоступна.";
  if (e.status === 429) return "Слишком много попыток. Подождите минуту.";
  if (e.status === 400 && /password/i.test(e.message)) return "Пароль: минимум 8 символов и хотя бы одна цифра.";
  return e.message;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1, padding: space.lg, justifyContent: "center", gap: space.xl },
  header: { alignItems: "center", gap: space.sm },
  tagline: { ...typography.muted, textAlign: "center", maxWidth: 260 },
  form: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, gap: space.md,
    shadowColor: colors.plumDeep, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  error: { color: colors.orange, fontSize: 13, fontWeight: "600" },
  hint: { ...typography.muted, textAlign: "center" },
});
