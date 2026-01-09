import { Customer } from "./models";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ConfirmEmail: { email: string; orgId?: string };
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type AppStackParamList = {
  Customers: undefined;
  CustomerDetail: { customer: Customer };
  Profile: undefined;
};
