package controllers;

import play.*;
import play.mvc.*;
import play.data.*;

import views.html.*;

public static class Login{
	public String email;
	public String password;
}

public class Application extends Controller {

    public static Result index() {
        return ok(login.render(form(Login.class)));
    }

    public static Result student() {
    	return ok(student.render());
    }

    public static Result teacher() {
    	return ok(teacher.render());
    }
}
