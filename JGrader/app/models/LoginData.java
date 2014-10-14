package models;

public class LoginData{

  public String email;
  public String password;

  public LoginData(String email, String password){
    this.email = email;
    this.password = password;
  }

  public static LoginData makeLogin(LoginForm form){
    return new LoginData(form.email,form.password);
  }
}
