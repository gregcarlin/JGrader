package models;

public class Teacher{

  public String email;
  public String password;

  public Teacher(String email, String password){
    this.email = email;
    this.password = password;
  }

  public static Teacher makeLogin(LoginForm form){
    return new Teacher(form.email,form.password);
  }


}
